'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GroundedSkybox } from 'three/examples/jsm/objects/GroundedSkybox.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

interface VRMStageProps {
    personaName: string;
    agentVolume: { volume: number; a: number; i: number; u: number; e: number; o: number };
    isThinking: boolean;
    agentGesture: string | null;
}

/**
 * EXPLICIT BONE MAPPING (Source -> Target)
 */
const MIXAMO_TO_AVATURN_MAP: Record<string, string> = {
    'mixamorigHips': 'Hips',
    'mixamorigSpine': 'Spine',
    'mixamorigSpine1': 'Spine1',
    'mixamorigSpine2': 'Spine2',
    'mixamorigNeck': 'Neck',
    'mixamorigHead': 'Head',
    'mixamorigLeftShoulder': 'LeftShoulder',
    'mixamorigLeftArm': 'LeftArm',
    'mixamorigLeftForeArm': 'LeftForeArm',
    'mixamorigLeftHand': 'LeftHand',
    'mixamorigRightShoulder': 'RightShoulder',
    'mixamorigRightArm': 'RightArm',
    'mixamorigRightForeArm': 'RightForeArm',
    'mixamorigRightHand': 'RightHand',
    'mixamorigLeftUpLeg': 'LeftUpLeg',
    'mixamorigLeftLeg': 'LeftLeg',
    'mixamorigLeftFoot': 'LeftFoot',
    'mixamorigRightUpLeg': 'RightUpLeg',
    'mixamorigRightLeg': 'RightLeg',
    'mixamorigRightFoot': 'RightFoot'
};

const AVATURN_TO_MIXAMO_MAP: Record<string, string> = {};
Object.entries(MIXAMO_TO_AVATURN_MAP).forEach(([mix, ava]) => {
    AVATURN_TO_MIXAMO_MAP[ava] = mix;
});

export default function VRMStage({ personaName, agentVolume, isThinking, agentGesture }: VRMStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
    const activeActionRef = useRef<THREE.AnimationAction | null>(null);
    const activeAnimNameRef = useRef<string>('idle');
    const modelRef = useRef<THREE.Group | null>(null);
    const faceMeshRef = useRef<THREE.SkinnedMesh | null>(null);

    const [debugError, setDebugError] = useState<string | null>(null);

    // STALE CLOSURE FIX: Keep a mutable ref of the latest volume data
    const latestVolumeRef = useRef(agentVolume);
    useEffect(() => {
        latestVolumeRef.current = agentVolume;
    }, [agentVolume]);

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;
        let isMounted = true;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
        camera.position.set(0, 1.2, 4.0); // Widen for full body

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: true,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        rendererRef.current = renderer;

        const handleResize = () => {
            if (!containerRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        handleResize();
        window.addEventListener('resize', handleResize);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0.8, 0); // Center on body
        controls.enableDamping = true;
        controls.update();

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 5, 5);
        scene.add(dirLight);

        // Env
        new HDRLoader().load('/backgrounds/ahornsteig_4k.hdr', (texture) => {
            if (!isMounted) return;
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
            const skybox = new GroundedSkybox(texture, 1.6, 100);
            skybox.position.y = 1.6;
            scene.add(skybox);
        });

        const gltfLoader = new GLTFLoader();
        const fbxLoader = new FBXLoader();
        const safePersona = (personaName || 'tony').toLowerCase();

        gltfLoader.load(`/models/${safePersona}.glb`, (gltf) => {
            if (!isMounted) return;
            const model = gltf.scene;
            modelRef.current = model;
            scene.add(model);

            // Discovery
            let targetSkinnedMesh: THREE.SkinnedMesh | null = null;
            model.traverse((child) => {
                if ((child as any).isSkinnedMesh) {
                    const sm = child as THREE.SkinnedMesh;
                    if (!targetSkinnedMesh && sm.skeleton) targetSkinnedMesh = sm;
                    
                    // FIX: Strictly identify the face by checking for actual mouth morph targets
                    // This prevents clothing meshes from overwriting the faceMeshRef
                    if (sm.morphTargetDictionary) {
                        const hasMouthMorphs = 
                            sm.morphTargetDictionary['jawOpen'] !== undefined || 
                            sm.morphTargetDictionary['viseme_aa'] !== undefined ||
                            sm.morphTargetDictionary['mouthOpen'] !== undefined;
                            
                        if (hasMouthMorphs) {
                            faceMeshRef.current = sm;
                        }
                    }
                }
            });

            if (!targetSkinnedMesh) {
                setDebugError('No SkinnedMesh found in GLB');
                return;
            }

            const mixer = new THREE.AnimationMixer(model);
            mixerRef.current = mixer;

            const bbox = new THREE.Box3().setFromObject(model);
            model.position.y = -bbox.min.y;

            const animFiles = [
                { name: 'idle', file: 'Breathing Idle.fbx' },
                { name: 'talking_1', file: 'Talking.fbx' },
                { name: 'talking_2', file: 'Talking (1).fbx' },
                { name: 'victory', file: 'Victory.fbx' }
            ];

            animFiles.forEach((cfg) => {
                fbxLoader.load(`/animations/${cfg.file}`, (fbx) => {
                    if (!isMounted) return;
                    try {
                        const sourceClip = fbx.animations[0];
                        if (!sourceClip) return;

                        // ROBUST SKELETON SOURCE
                        // retargetClip REQUIRES the 2nd argument to have a .skeleton property.
                        let sourceObj: any = null;
                        fbx.traverse(c => {
                            if ((c as any).isSkinnedMesh && (c as THREE.SkinnedMesh).skeleton) sourceObj = c;
                        });

                        // Surrogate if no SkinnedMesh found
                        if (!sourceObj) {
                            const bones: THREE.Bone[] = [];
                            fbx.traverse(c => { if ((c as any).isBone) bones.push(c as THREE.Bone); });
                            
                            // FIX: Attach the skeleton directly to the FBX group root.
                            // This allows the internal AnimationMixer in retargetClip to properly
                            // find and animate the bone hierarchy during the sampling phase.
                            const skeleton = new THREE.Skeleton(bones);
                            (fbx as any).skeleton = skeleton;
                            sourceObj = fbx;
                        }

                        // CRITICAL ARGUMENT FIX:
                        // 1st arg MUST be an Object3D (e.g. SkinnedMesh), NOT a Skeleton.
                        // SkeletonUtils.retargetClip internally calls target.skeleton!
                        const retargetedClip = SkeletonUtils.retargetClip(targetSkinnedMesh!, sourceObj, sourceClip, {
                            names: AVATURN_TO_MIXAMO_MAP,
                            hip: 'mixamorigHips'
                        });

                        // Normalization
                        retargetedClip.tracks.forEach(track => {
                            const match = track.name.match(/\.bones\[([^\]]+)\]\.(.+)/);
                            if (match) track.name = `${match[1]}.${match[2]}`;
                            if (track.name.toLowerCase().includes('position')) {
                                for (let i = 0; i < track.values.length; i++) track.values[i] *= 0.01;
                            }
                        });

                        const action = mixer.clipAction(retargetedClip);
                        actionsRef.current[cfg.name] = action;

                        if (cfg.name === 'idle') {
                            action.play();
                            activeActionRef.current = action;
                            setDebugError(null); // Clear errors on success
                        }
                    } catch (e: any) {
                        console.error(`[VRMStage] Retargeting failed:`, e);
                        setDebugError(`Anim Error: ${e.message}`);
                    }
                });
            });
        }, undefined, (err) => {
            setDebugError(`GLB Error: ${err}`);
        });

        // Loop
        let frameId: number;
        let lastTime = performance.now();

        const animate = () => {
            if (!isMounted) return;
            frameId = requestAnimationFrame(animate);

            const now = performance.now();
            const dt = Math.min((now - lastTime) / 1000, 0.1);
            lastTime = now;

            if (mixerRef.current) {
                mixerRef.current.update(dt);
            }

            // Lip Sync
            const face = faceMeshRef.current;
            if (face && face.morphTargetDictionary && face.morphTargetInfluences) {
                const dict = face.morphTargetDictionary;
                const inf = face.morphTargetInfluences;
                
                // READ FROM THE REF, NOT THE STALE PROP
                const currentVol = latestVolumeRef.current; 

                const setMorph = (name: string, val: number, speed = 0.2) => {
                    const idx = dict[name];
                    if (idx !== undefined) inf[idx] = THREE.MathUtils.lerp(inf[idx], val, speed);
                };

                // WAWA STYLE: Smooth, expressive blending
                const smoothSpeed = 0.5; 
                const oralVol = currentVol.volume || 0;
                setMorph('jawOpen', oralVol * 1.5, smoothSpeed);
                setMorph('mouthOpen', oralVol * 1.0, smoothSpeed);

                // SAFEGUARD: Dynamically map Wawa visemes to the correct GLB blendshape names
                const mapViseme = (wawaVal: number, vrmName1: string, vrmName2: string) => {
                    if (dict[vrmName1] !== undefined) setMorph(vrmName1, wawaVal, smoothSpeed);
                    else if (dict[vrmName2] !== undefined) setMorph(vrmName2, wawaVal, smoothSpeed);
                };

                mapViseme(currentVol.a || 0, 'v_aa', 'viseme_aa');
                mapViseme(currentVol.i || 0, 'v_ih', 'viseme_I');
                mapViseme(currentVol.u || 0, 'v_ou', 'viseme_U');
                mapViseme(currentVol.e || 0, 'v_ee', 'viseme_E');
                mapViseme(currentVol.o || 0, 'v_oh', 'viseme_O');

                const now = performance.now();
                const blink = (now % 5000) < 150 ? 1 : 0;
                setMorph('eyeBlinkLeft', blink, 0.5);
                setMorph('eyeBlinkRight', blink, 0.5);
            }

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            isMounted = false;
            cancelAnimationFrame(frameId);
            renderer.dispose();
            controls.dispose();
        };
    }, [personaName]);

    // Gestures
    useEffect(() => {
        if (!agentGesture) return;
        const action = actionsRef.current[agentGesture];
        if (action && activeActionRef.current) {
            action.reset().setLoop(THREE.LoopOnce, 1).setEffectiveWeight(1).fadeIn(0.2).play();
            activeActionRef.current.fadeOut(0.2);

            const duration = action.getClip().duration * 1000;
            setTimeout(() => {
                const idle = actionsRef.current['idle'];
                if (idle && activeActionRef.current === action) {
                    idle.reset().fadeIn(0.5).play();
                    action.fadeOut(0.5);
                    activeActionRef.current = idle;
                    activeAnimNameRef.current = 'idle';
                }
            }, duration);

            activeActionRef.current = action;
            activeAnimNameRef.current = agentGesture;
        }
    }, [agentGesture]);

    // Volume
    useEffect(() => {
        const vol = agentVolume.volume;
        const isSpeaking = vol > 0.05;

        if (isSpeaking && activeAnimNameRef.current === 'idle') {
            const next = Math.random() > 0.5 ? 'talking_1' : 'talking_2';
            const action = actionsRef.current[next];
            if (action && activeActionRef.current) {
                action.reset().setEffectiveWeight(1).fadeIn(0.2).play();
                activeActionRef.current.fadeOut(0.2);
                activeActionRef.current = action;
                activeAnimNameRef.current = next;
            }
        } else if (!isSpeaking && activeAnimNameRef.current.startsWith('talking')) {
            const idle = actionsRef.current['idle'];
            if (idle && activeActionRef.current) {
                idle.reset().setEffectiveWeight(1).fadeIn(0.4).play();
                activeActionRef.current.fadeOut(0.4);
                activeActionRef.current = idle;
                activeAnimNameRef.current = 'idle';
            }
        }
    }, [agentVolume.volume]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
            {debugError && (
                <div style={{ position: 'absolute', top: 10, right: 10, color: 'white', background: 'rgba(255,0,0,0.8)', padding: '10px 20px', zIndex: 10000, borderRadius: '8px' }}>
                    🚨 ERROR: {debugError}
                </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
}
