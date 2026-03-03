'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

interface VRMStageProps {
    personaName: string;
    agentVolume: number;
    isThinking: boolean;
}

export default function VRMStage({ personaName, agentVolume, isThinking }: VRMStageProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const vrmRef = useRef<VRM | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const clockRef = useRef(new THREE.Clock());

    useEffect(() => {
        if (!canvasRef.current) return;

        // --- Scene Setup ---
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(30.0, 1.0, 0.1, 20.0);
        camera.position.set(0.0, 1.4, 1.2); // Framing the head/torso

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);
        rendererRef.current = renderer;

        // --- Lighting (Premium Editorial) ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(1.0, 1.0, 1.0).normalize();
        scene.add(dirLight);

        // --- Asset Loading (VRM with 3D Image Fallback) ---
        const loadAsset = async () => {
            const loader = new GLTFLoader();
            loader.register((parser) => new VRMLoaderPlugin(parser));

            // Try to load the VRM dynamically based on user persona
            const safePersona = personaName ? personaName.toLowerCase() : 'despina';
            const modelUrl = `/avatars/${safePersona}.vrm`;

            try {
                // Check if file exists roughly (or just let loader catch it)
                loader.load(
                    modelUrl,
                    (gltf) => {
                        const vrm = gltf.userData.vrm as VRM;
                        vrmRef.current = vrm;
                        scene.add(vrm.scene);
                        vrm.scene.rotation.y = Math.PI;
                        VRMUtils.removeUnnecessaryVertices(gltf.scene);
                    },
                    undefined,
                    async (error) => {
                        console.warn('VRM not found, falling back to 3D Image Billboard:', error);
                        // FALLBACK: Load a high-fidelity 3D-looking 2D Plane
                        const texLoader = new THREE.TextureLoader();
                        // Use the new 3D-style avatar we just generated
                        const texture = await texLoader.loadAsync(`/avatars/${personaName.toLowerCase()}_3d.png`).catch(() =>
                            texLoader.loadAsync('/avatars/despina_3d.png')
                        );

                        const geometry = new THREE.PlaneGeometry(1, 1);
                        const material = new THREE.MeshBasicMaterial({
                            map: texture,
                            transparent: true,
                            side: THREE.DoubleSide
                        });
                        const billboard = new THREE.Mesh(geometry, material);
                        billboard.position.set(0, 1.4, 0); // Align with head height
                        scene.add(billboard);

                        // Store a mock "vrm" or just use the billboard for animation
                        (vrmRef.current as any) = {
                            scene: billboard,
                            update: () => {
                                // Simple reactive scaling for the billboard
                                const scale = 1.0 + agentVolume * 0.2;
                                billboard.scale.set(scale, scale, 1);

                                // Subtle floating motion
                                const t = Date.now() / 1000;
                                billboard.position.y = 1.4 + Math.sin(t * 2) * 0.02;
                            }
                        };
                    }
                );
            } catch (e) {
                console.error('Final Load Error:', e);
            }
        };

        loadAsset();

        // --- Animation Loop ---
        const animate = () => {
            requestAnimationFrame(animate);
            const delta = clockRef.current.getDelta();

            if (vrmRef.current) {
                const vrm = vrmRef.current;

                // 1. Natural Idle Sway / Update logic
                if (vrm.update && typeof vrm.update === 'function') {
                    // Handle both VRM and Billboard updates
                    if ((vrm as any).humanoid) {
                        // VRM Logic
                        const t = Date.now() / 1000;
                        vrm.humanoid?.getRawBoneNode('neck')?.rotation.set(
                            Math.sin(t * 0.5) * 0.05,
                            Math.cos(t * 0.8) * 0.05,
                            0
                        );
                        const mouthOpen = Math.min(1.0, agentVolume * 10.0);
                        vrm.expressionManager?.setValue('aa', mouthOpen);
                        if (isThinking) {
                            const blink = Math.sin(t * 10) > 0.8 ? 1 : 0;
                            vrm.expressionManager?.setValue('blink', blink);
                        }
                        vrm.update(delta);
                    } else {
                        // Billboard Mock Update
                        (vrm as any).update();
                    }
                }
            }

            renderer.render(scene, camera);
        };
        animate();

        return () => {
            renderer.dispose();
        };
    }, [personaName, agentVolume, isThinking]);

    // Resize handler
    useEffect(() => {
        const handleResize = () => {
            if (!rendererRef.current || !canvasRef.current) return;
            const size = canvasRef.current.parentElement?.clientWidth || 400;
            rendererRef.current.setSize(size, size);
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="vrm-stage-container" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}
