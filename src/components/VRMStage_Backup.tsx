'use client';

import React, { useEffect, useRef } from 'react';
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
    'mixamorig:Hips': 'Hips',
    'mixamorig:Spine': 'Spine',
    'mixamorig:Spine1': 'Spine1',
    'mixamorig:Spine2': 'Spine2',
    'mixamorig:Neck': 'Neck',
    'mixamorig:Head': 'Head',
    'mixamorig:LeftShoulder': 'LeftShoulder',
    'mixamorig:LeftArm': 'LeftArm',
    'mixamorig:LeftForeArm': 'LeftForeArm',
    'mixamorig:LeftHand': 'LeftHand',
    'mixamorig:RightShoulder': 'RightShoulder',
    'mixamorig:RightArm': 'RightArm',
    'mixamorig:RightForeArm': 'RightForeArm',
    'mixamorig:RightHand': 'RightHand',
    'mixamorig:LeftUpLeg': 'LeftUpLeg',
    'mixamorig:LeftLeg': 'LeftLeg',
    'mixamorig:LeftFoot': 'LeftFoot',
    'mixamorig:RightUpLeg': 'RightUpLeg',
    'mixamorig:RightLeg': 'RightLeg',
    'mixamorig:RightFoot': 'RightFoot'
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

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;
        let isMounted = true;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
        camera.position.set(0, 1.4, 3.5);

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
        controls.target.set(0, 1.2, 0);
        controls.enableDamping = true;
        controls.update();

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 5, 5);
        scene.add(dirLight);

        // Environment
        const hdrLoader = new HDRLoader();
        hdrLoader.load('/backgrounds/ahornsteig_4k.hdr', (texture) => {
            if (!isMounted) return;
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
            const skybox = new GroundedSkybox(texture, 1.6, 100);
            skybox.position.y = 1.6;
            scene.add(skybox);
        });

        // ASSET LOADING
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
                    // We need the main body SkinnedMesh for retargeting
                    if (!targetSkinnedMesh && sm.skeleton) targetSkinnedMesh = sm;
                    if (child.name.toLowerCase().includes('head') || (child as any).morphTargetInfluences) {
                        faceMeshRef.current = child as THREE.SkinnedMesh;
                    }
                }
            });

            if (!targetSkinnedMesh) {
                console.warn('[VRMStage] No SkinnedMesh with skeleton found');
                return;
            }

            /**
             * MIXER TARGETING
             * We use the SkinnedMesh as the mixer root.
             * SkeletonUtils.retargetClip produces tracks in ".bones[Name].property" format.
             * These tracks bind perfectly to a SkinnedMesh root.
             */
            const mixer = new THREE.AnimationMixer(targetSkinnedMesh);
            mixerRef.current = mixer;

            // Grounding
            const bbox = new THREE.Box3().setFromObject(model);
            model.position.y = -bbox.min.y;

            const animFiles = [
                { name: 'idle', file: 'Idle (1).fbx' },
                { name: 'talking_1', file: 'Talking.fbx' },
                { name: 'talking_2', file: 'Talking (1).fbx' }
            ];

            animFiles.forEach((cfg) => {
                fbxLoader.load(`/animations/${cfg.file}`, (fbx) => {
                    if (!isMounted) return;
                    try {
                        const sourceClip = fbx.animations[0];
                        if (!sourceClip) return;

                        // Find source that has a skeleton
                        let sourceObj: any = fbx;
                        fbx.traverse(c => { 
                            if ((c as any).isSkinnedMesh && (c as THREE.SkinnedMesh).skeleton) sourceObj = c;
                        });

                        const retargetedClip = SkeletonUtils.retargetClip(targetSkinnedMesh!, sourceObj, sourceClip, { 
                            names: AVATURN_TO_MIXAMO_MAP,
                            hip: 'mixamorig:Hips'
                        });

                        // Standard scaling for Mixamo (cm) to Three.js (m)
                        retargetedClip.tracks.forEach(track => {
                            if (track.name.toLowerCase().includes('position')) {
                                for (let i = 0; i < track.values.length; i++) {
                                    track.values[i] *= 0.01;
                                }
                            }
                        });

                        const action = mixer.clipAction(retargetedClip);
                        actionsRef.current[cfg.name] = action;

                        if (cfg.name === 'idle') {
                            action.play();
                            activeActionRef.current = action;
                        }
                    } catch (e) {
                        console.error(`[VRMStage] Retargeting failed for ${cfg.file}:`, e);
                    }
                });
            });
        });

        // LOOP
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

            // LIP SYNC & BLINKING
            const face = faceMeshRef.current;
            if (face && face.morphTargetDictionary && face.morphTargetInfluences) {
                const dict = face.morphTargetDictionary;
                const inf = face.morphTargetInfluences;
                const vol = agentVolume.volume;

                const setMorph = (name: string, val: number, speed = 0.2) => {
                    const idx = dict[name];
                    if (idx !== undefined) inf[idx] = THREE.MathUtils.lerp(inf[idx], val, speed);
                };

                setMorph('jawOpen', vol * 1.5, 0.3);
                setMorph('mouthOpen', vol * 1.0, 0.3);
                setMorph('v_aa', agentVolume.a * 1.2, 0.3);
                setMorph('v_ih', agentVolume.i * 1.2, 0.3);
                setMorph('v_ou', agentVolume.u * 1.2, 0.3);

                const blink = (now % 4000) < 150 ? 1 : 0;
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
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            controls.dispose();
        };
    }, [personaName]);

    // Dynamic Speaking Animation Switch
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
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
}
