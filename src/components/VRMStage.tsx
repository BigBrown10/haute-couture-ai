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

    // Use refs for rapidly changing props to prevent re-initializing the entire 3D scene
    const volumeRef = useRef(agentVolume);
    const thinkingRef = useRef(isThinking);

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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(1.0, 1.0, 1.0).normalize();
        scene.add(dirLight);

        // Spotlight exact center for the podium
        const spotLight = new THREE.SpotLight(0xffddaa, 2.5); // Warm gold tint
        spotLight.position.set(0, 3, 2);
        spotLight.angle = Math.PI / 6;
        spotLight.penumbra = 0.5;
        spotLight.target.position.set(0, 0, 0);
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
            const modelUrl = `/avatars/${safePersona}.vrm`;

            try {
                loader.load(
                    modelUrl,
                    (gltf) => {
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

                // Lip Sync based on True WebAudio Viseme Analysis (VRM 1.0 AND VRM 0.0)
                const mouthOpen = visemes.a;
                const mouthWide = visemes.i;
                const mouthRound = visemes.u;

                // VRM 1.0 keys
                currentVrm.expressionManager?.setValue('aa', mouthOpen);
                currentVrm.expressionManager?.setValue('ih', mouthWide);
                currentVrm.expressionManager?.setValue('oh', mouthRound);

                // VRM 0.0 fallback keys
                currentVrm.expressionManager?.setValue('a', mouthOpen);
                currentVrm.expressionManager?.setValue('i', mouthWide);
                currentVrm.expressionManager?.setValue('u', mouthRound);

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
