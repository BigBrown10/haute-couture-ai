'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

interface VRMStageProps {
    personaName: string;
    agentVolume: number;
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
        camera.position.set(0.0, 1.2, 2.6); // Frame wider to show torso properly

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
        controls.target.set(0.0, 1.1, 0.0); // Center orbit around chest level
        controls.enablePan = false;
        controls.enableZoom = true;
        controls.minDistance = 0.5;
        controls.maxDistance = 3.0;
        controls.update();

        // --- Lighting ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(1.0, 1.0, 1.0).normalize();
        scene.add(dirLight);

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

                        // Setup Relaxed Pose (A-Pose instead of T-Pose)
                        if (vrm.humanoid) {
                            const leftArm = vrm.humanoid.getRawBoneNode('leftUpperArm');
                            const rightArm = vrm.humanoid.getRawBoneNode('rightUpperArm');
                            if (leftArm) {
                                leftArm.rotation.z = 1.2;
                                leftArm.rotation.x = 0.2;
                            }
                            if (rightArm) {
                                rightArm.rotation.z = -1.2;
                                rightArm.rotation.x = 0.2;
                            }
                        }

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

                // Lip Sync based on Agent Volume
                const mouthOpen = Math.min(1.0, agentVolume * 5.0); // Boosted sensitivity
                currentVrm.expressionManager?.setValue('aa', mouthOpen);

                // Thinking (Blink Rapidly or hold)
                if (isThinking) {
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
                const scale = 1.0 + agentVolume * 0.15;
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
    }, [personaName, agentVolume, isThinking]);

    return (
        <div ref={containerRef} className="vrm-stage-container" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
}
