'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { VisemeData } from '@/hooks/useAudioPlayback';

interface VRMStageProps {
    personaName: string;
    agentVolume: VisemeData;
    isThinking: boolean;
}

export default function VRMStage({ personaName, agentVolume, isThinking }: VRMStageProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const vrmRef = useRef<VRM | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const clockRef = useRef(new THREE.Clock());
    const lookAtTargetRef = useRef(new THREE.Object3D());
    const mouseRef = useRef(new THREE.Vector2());

    // Fallback Rigging System for Raw GLB Meshes
    const customRigRef = useRef<{
        spine: { bone: THREE.Object3D, initX: number } | null;
        chest: { bone: THREE.Object3D, initX: number } | null;
        head: { bone: THREE.Object3D, initX: number, initY: number } | null;
        rightArm: THREE.Object3D | null;
        leftArm: THREE.Object3D | null;
        jaw: { bone: THREE.Object3D, initX: number } | null;
        faceMesh: THREE.Mesh | null;
        mouthMorphIndices: number[];
    }>({
        spine: null, chest: null, head: null, rightArm: null, leftArm: null, jaw: null, faceMesh: null, mouthMorphIndices: []
    });

    // Use refs for rapidly changing props to prevent re-initializing the entire 3D scene
    const volumeRef = useRef(agentVolume);
    const thinkingRef = useRef(isThinking);

    // Smooth Lip Sync State
    const smoothedVolumes = useRef({ a: 0, i: 0, u: 0 });
    const lerp = (start: number, end: number, amt: number) => {
        return (1 - amt) * start + amt * end;
    };

    useEffect(() => {
        volumeRef.current = agentVolume;
    }, [agentVolume]);

    useEffect(() => {
        thinkingRef.current = isThinking;
    }, [isThinking]);

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        // --- Scene Setup ---
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Add look at target to scene
        scene.add(lookAtTargetRef.current);

        // Responsive camera setup based on container aspect ratio
        const containerAspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(30.0, containerAspect || 1.0, 0.1, 20.0);
        // Frame the exact full body
        camera.position.set(0.0, 1.4, 4.5);

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);
        rendererRef.current = renderer;

        // --- Orbit Controls ---
        // Allow the user to drag the screen to spin and zoom around the agent interactively!
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0.0, 1.0, 0.0); // Center orbit near the waist for full body framing
        controls.enablePan = false;
        controls.enableZoom = true;
        controls.minDistance = 1.0;
        controls.maxDistance = 8.0; // CRITICAL: Stop the controls from snapping the camera forward!
        controls.update();

        // --- Lighting ---
        // Dramatic low ambient light for high contrast shadows
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambientLight);

        // Subtle cool rim light for edge definition
        const dirLight = new THREE.DirectionalLight(0x90b0d0, 0.4);
        dirLight.position.set(2.0, 1.0, -2.0).normalize();
        scene.add(dirLight);

        // Powerful Overhead/Frontal Spotlight directly on the Agent
        const spotLight = new THREE.SpotLight(0xffffff, 10.0); // Intense white spotlight
        spotLight.position.set(0, 3.5, 2.5);
        spotLight.angle = Math.PI / 7; // Narrow dramatic beam
        spotLight.penumbra = 0.4;      // Smooth falloff edge
        spotLight.target.position.set(0, 1.1, 0); // Focus exactly on the agent's upper body/face
        scene.add(spotLight);
        scene.add(spotLight.target);

        // --- Digital Runway Stage (Podium) ---
        // Premium, small, sleek runway disc
        const podiumGeo = new THREE.CylinderGeometry(0.45, 0.48, 0.06, 64);
        const podiumMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, // Richer Gold
            metalness: 0.9,
            roughness: 0.15
        });
        const podium = new THREE.Mesh(podiumGeo, podiumMat);

        // Lift the entire set (avatar + podium) UP by 0.35 units. 
        // This ensures the feet and podium sit cleanly above the bottom HTML UI!
        const globalYShift = 0.35;
        podium.position.y = globalYShift - 0.03; // subtract half height so its surface is precisely at globalYShift
        scene.add(podium);

        // --- Asset Loading ---
        let currentVrm: VRM | null = null;
        let activeBillboard: THREE.Mesh | null = null;

        const loadAsset = async () => {
            const loader = new GLTFLoader();
            loader.register((parser) => new VRMLoaderPlugin(parser));

            const safePersona = personaName ? personaName.toLowerCase() : 'despina';
            const modelUrl = safePersona === 'tony' ? '/models/tony-model.glb' : `/avatars/${safePersona}.vrm`;

            try {
                loader.load(
                    modelUrl,
                    (gltf) => {
                        if (gltf.userData.vrm) {
                            const vrm = gltf.userData.vrm as VRM;
                            currentVrm = vrm;
                            vrmRef.current = vrm;
                            scene.add(vrm.scene);
                            vrm.scene.rotation.y = Math.PI;
                            vrm.scene.position.y = globalYShift; // Lift the avatar to stand exactly on the shifted podium

                            // Remove static raw bone assignment here, it gets overwritten.
                            // We will enforce the relaxed pose and procedural animation inside the render loop.

                            // Setup LookAt for mouse tracking
                            if (vrm.lookAt) {
                                vrm.lookAt.target = lookAtTargetRef.current;
                            }

                            // Disable Frustum culling for robust rendering
                            vrm.scene.traverse((obj) => {
                                obj.frustumCulled = false;
                            });
                        } else {
                            // Standard GLTF/GLB Fallback (No VRM Extensions)
                            const model = gltf.scene;
                            scene.add(model);
                            model.position.y = globalYShift;

                            const rig = customRigRef.current;
                            model.traverse((obj) => {
                                obj.frustumCulled = false;

                                // Extract Generic Bone Bindings
                                if (obj.type === 'Bone') {
                                    const name = obj.name.toLowerCase();

                                    if (!rig.spine && name.includes('spine') && !name.includes('1') && !name.includes('2')) {
                                        rig.spine = { bone: obj, initX: obj.rotation.x };
                                    } else if (!rig.chest && (name.includes('spine1') || name.includes('spine_1') || name.includes('chest'))) {
                                        rig.chest = { bone: obj, initX: obj.rotation.x };
                                    } else if (!rig.head && name.includes('head')) {
                                        rig.head = { bone: obj, initX: obj.rotation.x, initY: obj.rotation.y };
                                    } else if (!rig.jaw && name.includes('jaw')) {
                                        rig.jaw = { bone: obj, initX: obj.rotation.x };
                                    } else if (!rig.rightArm && name.includes('right') && name.includes('arm') && !name.includes('fore')) {
                                        rig.rightArm = obj;
                                    } else if (!rig.leftArm && name.includes('left') && name.includes('arm') && !name.includes('fore')) {
                                        rig.leftArm = obj;
                                    }
                                }

                                // Extract Morph Targets
                                if (obj.type === 'Mesh' || obj.type === 'SkinnedMesh') {
                                    const mesh = obj as THREE.Mesh;
                                    if (mesh.morphTargetDictionary) {
                                        const dict = mesh.morphTargetDictionary;
                                        const mouthKeys = Object.keys(dict).filter(k =>
                                            k.toLowerCase().includes('mouth') || k.toLowerCase().includes('jaw') ||
                                            k.toLowerCase().includes('lip') || k.toLowerCase().includes('viseme')
                                        );
                                        if (mouthKeys.length > 0) {
                                            rig.faceMesh = mesh;
                                            rig.mouthMorphIndices = mouthKeys.map(k => dict[k]);
                                        }
                                    }
                                }
                            });

                            // Pre-apply brute-force relaxations for rigid Avaturn / RPM rigs that ignore Z-drops
                            if (rig.rightArm) {
                                rig.rightArm.rotation.z = -1.1; // Drop down
                                rig.rightArm.rotation.x = 0.5;  // Pull forward
                                rig.rightArm.rotation.y = -0.2; // Twist to side
                            }
                            if (rig.leftArm) {
                                rig.leftArm.rotation.z = 1.1;
                                rig.leftArm.rotation.x = 0.5;
                                rig.leftArm.rotation.y = 0.2;
                            }

                            // Let the console know this model is completely lacking facial structures
                            if (rig.mouthMorphIndices.length === 0 && !rig.jaw) {
                                console.warn('MODEL ALERT: This GLB physically lacks facial morph targets and jaw bones. Synthesizing speech via Head Bobbing.');
                            }

                            console.log('Successfully loaded and auto-rigged raw GLB mesh.');
                        }

                        VRMUtils.removeUnnecessaryVertices(gltf.scene);
                    },
                    undefined,
                    async (error) => {
                        console.warn('VRM not found, falling back to 3D Image Billboard:', error);
                        const texLoader = new THREE.TextureLoader();
                        // 2D Falback
                        const texture = await texLoader.loadAsync(`/avatars/${personaName.toLowerCase()}_3d.png`).catch(() =>
                            texLoader.loadAsync('/avatars/despina_3d.png')
                        );

                        const geometry = new THREE.PlaneGeometry(1, 1);
                        const material = new THREE.MeshBasicMaterial({
                            map: texture,
                            transparent: true,
                            side: THREE.DoubleSide
                        });
                        activeBillboard = new THREE.Mesh(geometry, material);
                        activeBillboard.position.set(0, 1.4, 0);
                        scene.add(activeBillboard);
                    }
                );
            } catch (e) {
                console.error('Final Load Error:', e);
            }
        };

        loadAsset();

        // --- Mouse Tracking Logic ---
        const handleMouseMove = (event: MouseEvent) => {
            // Normalized Device Coordinates (-1 to +1)
            mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // Move target based on cursor
            // The camera is at z=1.2, character at z=0. 
            // We place the target slightly in front of the camera so the agent's eyes track it.
            lookAtTargetRef.current.position.x = mouseRef.current.x * 0.5;
            lookAtTargetRef.current.position.y = 1.4 + mouseRef.current.y * 0.5;
            lookAtTargetRef.current.position.z = 1.0;
        };
        window.addEventListener('mousemove', handleMouseMove);

        // --- Animation Loop ---
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const delta = clockRef.current.getDelta();

            if (currentVrm) {
                const t = Date.now() / 1000;

                // --- Voice and Body Sync Animation ---
                const visemes = volumeRef.current;
                const currentVol = visemes.volume;

                // 1. Procedural Lifelike Breathing and Posture (Organic Body Sync)
                if (currentVrm.humanoid) {
                    const spine = currentVrm.humanoid.getNormalizedBoneNode('spine');
                    if (spine) {
                        spine.rotation.x = Math.sin(t * 1.5) * 0.02; // breathing expansion
                        spine.rotation.y = Math.sin(t * 0.5) * 0.01; // subtle body weight shift
                    }

                    const chest = currentVrm.humanoid.getNormalizedBoneNode('chest');
                    if (chest) {
                        // Chest subtly inflates when breathing, and more when speaking loudly
                        chest.rotation.x = (Math.sin(t * 1.5) * 0.01) + (currentVol * 0.05);
                        chest.rotation.z = Math.cos(t * 1.0) * 0.01;
                    }

                    // 2. Lifelike Arm Posings (Bent elbows, natural resting, asymmetrical gestures)
                    const leftArm = currentVrm.humanoid.getNormalizedBoneNode('leftUpperArm');
                    if (leftArm) {
                        leftArm.rotation.z = 1.25; // Drop arms fully down
                        leftArm.rotation.x = 0.3;  // Bring arms cleanly forward to rest gently in front of the hips (avoids side vest clipping)
                        leftArm.rotation.y = -0.2; // Twist inward softly
                    }
                    const leftElbow = currentVrm.humanoid.getNormalizedBoneNode('leftLowerArm');
                    if (leftElbow) {
                        // Bend elbow naturally forward. When talking loudly, gesture wrist upwards/forward organically
                        leftElbow.rotation.z = 0.1;
                        leftElbow.rotation.x = -0.3 - (currentVol * (Math.sin(t * 3.2) + 1) * 0.25);
                    }
                    const leftHand = currentVrm.humanoid.getNormalizedBoneNode('leftHand');
                    if (leftHand) leftHand.rotation.x = -0.15; // Relaxed wrist droop downward

                    const rightArm = currentVrm.humanoid.getNormalizedBoneNode('rightUpperArm');
                    if (rightArm) {
                        rightArm.rotation.z = -1.25; // Mirror left drop
                        rightArm.rotation.x = 0.3;   // Bring forward
                        rightArm.rotation.y = 0.2;   // Twist inward
                    }
                    const rightElbow = currentVrm.humanoid.getNormalizedBoneNode('rightLowerArm');
                    if (rightElbow) {
                        // Asymmetrical gesture mapping so hands don't move identically like a robot
                        rightElbow.rotation.z = -0.1;
                        rightElbow.rotation.x = -0.35 - (currentVol * (Math.cos(t * 2.7) + 1) * 0.25);
                    }
                    const rightHand = currentVrm.humanoid.getNormalizedBoneNode('rightHand');
                    if (rightHand) rightHand.rotation.x = -0.15;

                    // Relax the fingers so they aren't stiff flat boards
                    const relaxFingers = (side: 'left' | 'right') => {
                        const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];
                        const joints = ['Proximal', 'Intermediate', 'Distal'];
                        fingers.forEach(finger => {
                            joints.forEach(joint => {
                                const boneName = `${side}${finger}${joint}`;
                                const node = currentVrm?.humanoid?.getNormalizedBoneNode(boneName as any);
                                if (node) {
                                    // Finger curling amount (thumb is less curled, pinky is most curled)
                                    let curl = 0.15;
                                    if (finger === 'Thumb') curl = 0.05;
                                    else if (finger === 'Middle') curl = 0.2;
                                    else if (finger === 'Ring') curl = 0.25;
                                    else if (finger === 'Little') curl = 0.3;

                                    // Add minor breathing variability so hands feel alive
                                    curl += Math.sin(t * 2.0) * 0.02;

                                    // Left hand normalizes to positive Z curl, Right hand to negative Z curl
                                    node.rotation.z = side === 'left' ? curl : -curl;
                                    // Angle fingers slightly inward to cup the palm naturally
                                    node.rotation.x = side === 'left' ? -0.05 : 0.05;
                                }
                            });
                        });
                    };
                    relaxFingers('left');
                    relaxFingers('right');

                    // 3. Voice-Driven Body Sync (Head/Neck Micro-movements)
                    const neck = currentVrm.humanoid.getNormalizedBoneNode('neck');
                    if (neck) {
                        // Neck sways counter to the spine to keep head level, plus organic talking bobs
                        neck.rotation.x = -Math.sin(t * 1.5) * 0.01 + (currentVol * 0.15 * Math.sin(t * 6));
                        neck.rotation.y = -Math.sin(t * 0.5) * 0.01 + (currentVol * 0.08 * Math.cos(t * 4.5));
                    }

                    const head = currentVrm.humanoid.getNormalizedBoneNode('head');
                    if (head) {
                        // Head does tiny organic tilts
                        head.rotation.z = Math.sin(t * 0.3) * 0.02;
                    }
                }

                // Smooth Lip Sync based on True WebAudio Viseme Analysis with Lerp
                const smoothAmt = 0.35; // The lower, the smoother (but lazier)
                smoothedVolumes.current.a = lerp(smoothedVolumes.current.a, visemes.a, smoothAmt);
                smoothedVolumes.current.i = lerp(smoothedVolumes.current.i, visemes.i, smoothAmt);
                smoothedVolumes.current.u = lerp(smoothedVolumes.current.u, visemes.u, smoothAmt);

                const mouthOpen = smoothedVolumes.current.a;
                const mouthWide = smoothedVolumes.current.i;
                const mouthRound = smoothedVolumes.current.u;

                // VRM 1.0 keys
                // 2. Viseme Lip Sync Integration (Hardware Mouth Sync)
                if (currentVol > 0.05) {
                    currentVrm.expressionManager?.setValue('aa', currentVol * 1.5);
                    currentVrm.expressionManager?.setValue('ih', mouthWide); // Keep ih for now
                    currentVrm.expressionManager?.setValue('oh', currentVol * 0.5);
                } else {
                    currentVrm.expressionManager?.setValue('aa', lerp(currentVrm.expressionManager.getValue('aa') || 0, 0, 0.2));
                    currentVrm.expressionManager?.setValue('ih', lerp(currentVrm.expressionManager.getValue('ih') || 0, 0, 0.2)); // Keep ih for now
                    currentVrm.expressionManager?.setValue('oh', lerp(currentVrm.expressionManager.getValue('oh') || 0, 0, 0.2));
                }

                // VRM 0.0 fallback keys
                // These are usually mapped to the same expressions as VRM 1.0, so we can apply the same logic
                if (currentVol > 0.05) {
                    currentVrm.expressionManager?.setValue('a', currentVol * 1.5);
                    currentVrm.expressionManager?.setValue('i', mouthWide);
                    currentVrm.expressionManager?.setValue('u', currentVol * 0.5);
                } else {
                    currentVrm.expressionManager?.setValue('a', lerp(currentVrm.expressionManager.getValue('a') || 0, 0, 0.2));
                    currentVrm.expressionManager?.setValue('i', lerp(currentVrm.expressionManager.getValue('i') || 0, 0, 0.2));
                    currentVrm.expressionManager?.setValue('u', lerp(currentVrm.expressionManager.getValue('u') || 0, 0, 0.2));
                }

                // Thinking (Blink Rapidly or hold)
                if (thinkingRef.current) {
                    const blink = Math.sin(t * 10) > 0.8 ? 1 : 0;
                    currentVrm.expressionManager?.setValue('blink', blink);
                } else {
                    // Normal subtle blinking
                    const blink = Math.sin(t * 0.5) > 0.95 ? 1 : 0;
                    currentVrm.expressionManager?.setValue('blink', blink);
                }

                currentVrm.update(delta);
            } else if (activeBillboard) {
                // Billboard Mock Update for 2D images
                const scale = 1.0 + volumeRef.current.volume * 0.15;
                activeBillboard.scale.set(scale, scale, 1);

                const t = Date.now() / 1000;
                activeBillboard.position.y = 1.4 + Math.sin(t * 2) * 0.02;
            } else {
                // --- Custom Rig GLB Fallback Procedural Animation ---
                const rig = customRigRef.current;
                const t = Date.now() / 1000;
                const currentVol = volumeRef.current.volume;

                // Organic Breathing & Posture
                if (rig.spine) rig.spine.bone.rotation.x = rig.spine.initX + Math.sin(t * 1.5) * 0.02;
                if (rig.chest) rig.chest.bone.rotation.x = rig.chest.initX + (Math.sin(t * 1.5) * 0.01) + (currentVol * 0.05);

                // Head tracking (Target Mouse)
                if (rig.head) {
                    const targetX = mouseRef.current.x * 0.5;
                    const targetY = mouseRef.current.y * 0.5;
                    rig.head.bone.rotation.y = lerp(rig.head.bone.rotation.y, rig.head.initY + targetX, 0.1);
                    rig.head.bone.rotation.x = lerp(rig.head.bone.rotation.x, rig.head.initX - targetY, 0.1);
                }

                // Audio Lip Sync Overrides
                if (currentVol > 0.05) {
                    // Jaw direct manipulation
                    if (rig.jaw) rig.jaw.bone.rotation.x = rig.jaw.initX + (currentVol * 0.25);

                    // Hardware Blendshapes / Morph Targets
                    if (rig.faceMesh && rig.faceMesh.morphTargetInfluences && rig.mouthMorphIndices.length > 0) {
                        rig.mouthMorphIndices.forEach(idx => {
                            rig.faceMesh!.morphTargetInfluences![idx] = lerp(rig.faceMesh!.morphTargetInfluences![idx], currentVol * 1.5, 0.3);
                        });
                    } else if (rig.head) {
                        // PS1 Era Talk Simulation: No jaw/lips available, bob the head organically to syllables
                        rig.head.bone.rotation.x += currentVol * 0.1;
                        if (rig.spine) rig.spine.bone.rotation.x += currentVol * 0.02;
                    }

                } else {
                    // Relax Jaw
                    if (rig.jaw) rig.jaw.bone.rotation.x = lerp(rig.jaw.bone.rotation.x, rig.jaw.initX, 0.2);

                    // Relax Morphs
                    if (rig.faceMesh && rig.faceMesh.morphTargetInfluences && rig.mouthMorphIndices.length > 0) {
                        rig.mouthMorphIndices.forEach(idx => {
                            rig.faceMesh!.morphTargetInfluences![idx] = lerp(rig.faceMesh!.morphTargetInfluences![idx], 0, 0.2);
                        });
                    }
                }
            }

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // --- Resize Handler ---
        const handleResize = () => {
            if (!containerRef.current || !rendererRef.current) return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            rendererRef.current.setSize(width, height);
        };

        // Use ResizeObserver for more robust container tracking
        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            resizeObserver.disconnect();
            cancelAnimationFrame(animationFrameId);
            controls.dispose();
            renderer.dispose();
        };
    }, [personaName]); // Critical: Removed agentVolume & isThinking to prevent canvas destruction loop

    return (
        <div ref={containerRef} className="vrm-stage-container" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
}
