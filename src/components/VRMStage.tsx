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

        // --- VRM Loading ---
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));

        // Use a default free VRM for now (or a placeholder path)
        // IN PRODUCTION: We would load Persona-specific models
        const modelUrl = '/models/default_avatar.vrm';

        loader.load(
            modelUrl,
            (gltf) => {
                const vrm = gltf.userData.vrm as VRM;
                vrmRef.current = vrm;
                scene.add(vrm.scene);
                vrm.scene.rotation.y = Math.PI; // Face the camera

                // Finalize scene
                VRMUtils.removeUnnecessaryVertices(gltf.scene);
                // In v3, lookAt is typically handled via the animator or plugin settings
            },
            (progress) => console.log('Loading VRM...', (progress.loaded / progress.total * 100).toFixed(2), '%'),
            (error) => console.error('VRM Load Error:', error)
        );

        // --- Animation Loop ---
        const animate = () => {
            requestAnimationFrame(animate);
            const delta = clockRef.current.getDelta();

            if (vrmRef.current) {
                const vrm = vrmRef.current;

                // 1. Natural Idle Sway
                const t = Date.now() / 1000;
                vrm.humanoid?.getRawBoneNode('neck')?.rotation.set(
                    Math.sin(t * 0.5) * 0.05,
                    Math.cos(t * 0.8) * 0.05,
                    0
                );

                // 2. Real-time LIP SYNC (wawa-style logic)
                // Map volume to 'Aa' viseme
                const mouthOpen = Math.min(1.0, agentVolume * 10.0);
                vrm.expressionManager?.setValue('aa', mouthOpen);

                // 3. Thinking Blink
                if (isThinking) {
                    const blink = Math.sin(t * 10) > 0.8 ? 1 : 0;
                    vrm.expressionManager?.setValue('blink', blink);
                }

                vrm.update(delta);
            }

            renderer.render(scene, camera);
        };
        animate();

        return () => {
            renderer.dispose();
            // Cleanup scene nodes if needed
        };
    }, []);

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
