'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface CameraFeedProps {
    enabled: boolean;
    onFrame: (frameBase64: string) => void;
}

export default function CameraFeed({ enabled, onFrame }: CameraFeedProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [hasCamera, setHasCamera] = useState(false);

    // Start/stop camera
    useEffect(() => {
        if (enabled) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [enabled]);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false, // Audio handled separately
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setHasCamera(true);
                startFrameCapture();
            }
        } catch (err) {
            console.error('[CameraFeed] Failed to start camera:', err);
            setHasCamera(false);
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        setHasCamera(false);
    }, []);

    // Capture 1 frame per second as Base64 JPEG
    const startFrameCapture = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState < 2) return;

            // Downscale for efficient transmission
            canvas.width = 640;
            canvas.height = 480;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const base64 = dataUrl.split(',')[1];
            if (base64) {
                onFrame(base64);
            }
        }, 1000); // 1 FPS
    }, [onFrame]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {hasCamera ? (
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />
            ) : (
                <div className="camera-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 'inherit' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '16px' }}>
                            <label className="glass-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '12px 24px', borderRadius: '30px', fontSize: '1.2rem' }}>
                                📤 Upload Photo
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            const base64 = (ev.target?.result as string).split(',')[1];
                                            if (base64) onFrame(base64);
                                        };
                                        reader.readAsDataURL(e.target.files[0]);
                                    }
                                }} />
                            </label>
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', opacity: 0.7 }}>
                            {enabled ? 'Camera off or unavailable' : 'Camera is off'}
                        </div>
                    </div>
                </div>
            )}
            {/* Hidden canvas for frame extraction */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
}
