'use client';

import { useRef, useCallback, useState } from 'react';
import { Lipsync } from 'wawa-lipsync';

export interface VisemeData {
    volume: number;
    a: number;
    i: number;
    u: number;
    e: number;
    o: number;
}

export function useAudioPlayback(onVolumeChange?: (visemes: VisemeData) => void) {
    const queueRef = useRef<AudioBufferSourceNode[]>([]);
    const nextStartTimeRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);
    
    const isPlayingRef = useRef(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const PLAYBACK_SAMPLE_RATE = 24000;
    const lipsyncRef = useRef<Lipsync | null>(null);

    const getContext = useCallback(() => {
        if (!lipsyncRef.current) {
            try {
                // STOP MONKEY-PATCHING: Let Wawa create its own AudioContext and Analyser
                const ls = new Lipsync({ fftSize: 1024, historySize: 5 });
                lipsyncRef.current = ls;
            } catch (err) {
                console.warn('[AudioPlayback] Wawa Lipsync init failed', err);
            }
        }

        const ls = lipsyncRef.current as any;
        if (ls && ls.audioContext.state === 'suspended') {
            ls.audioContext.resume();
        }
        return ls?.audioContext || null;
    }, []);

    const playChunk = useCallback(async (pcmData: Int16Array) => {
        try {
            const ctx = getContext();
            const ls = lipsyncRef.current as any;
            if (!ctx || !ls) return;

            // 1. Explicitly resume to bypass browser-level suspension
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            // 2. Convert Int16 PCM to Float32 for Web Audio
            const float32 = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
                float32[i] = pcmData[i] / 32768;
            }

            // 3. Create buffer at strict 24kHz
            const audioBuffer = ctx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
            audioBuffer.getChannelData(0).set(float32);

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;

            // Route our AI audio straight into Wawa's internal analyser, then to speakers
            source.connect(ls.analyser);
            ls.analyser.connect(ctx.destination);

            const now = ctx.currentTime;
            if (nextStartTimeRef.current < now) {
                nextStartTimeRef.current = now + 0.05;
            }

            const startTime = Math.max(now, nextStartTimeRef.current);
            source.start(startTime);
            nextStartTimeRef.current = startTime + audioBuffer.duration;

            queueRef.current.push(source);
            
            setIsPlaying(true);
            isPlayingRef.current = true;

            source.onended = () => {
                queueRef.current = queueRef.current.filter((s) => s !== source);
                if (queueRef.current.length === 0) {
                    setIsPlaying(false);
                    isPlayingRef.current = false;
                    if (onVolumeChange) onVolumeChange({ volume: 0, a: 0, i: 0, u: 0, e: 0, o: 0 });
                }
            };

            if (onVolumeChange && !animationFrameRef.current) {
                const updateVolume = () => {
                    if (isPlayingRef.current && ls) {
                        try {
                            ls.processAudio();
                            const vol = ls.features?.volume || 0;
                            const activeViseme = ls.viseme; 

                            onVolumeChange({
                                volume: Math.min(vol * 1.5, 1.0),
                                a: activeViseme === 'viseme_aa' ? 1.0 : 0,
                                i: activeViseme === 'viseme_I' ? 1.0 : 0,
                                u: activeViseme === 'viseme_U' ? 1.0 : 0,
                                e: activeViseme === 'viseme_E' ? 1.0 : 0,
                                o: activeViseme === 'viseme_O' ? 1.0 : 0
                            });
                        } catch (err) {
                            console.error('[AudioPlayback] LipSync Analysis Error:', err);
                        }
                        
                        animationFrameRef.current = requestAnimationFrame(updateVolume);
                    } else {
                        animationFrameRef.current = null;
                    }
                };
                updateVolume();
            }

        } catch (err) {
            console.error('[AudioPlayback] Error playing chunk:', err);
        }
    }, [getContext, onVolumeChange]);

    const stopPlayback = useCallback(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        for (const source of queueRef.current) {
            try { source.stop(); } catch { }
        }
        queueRef.current = [];
        nextStartTimeRef.current = 0;
        setIsPlaying(false);
        isPlayingRef.current = false;
        if (onVolumeChange) onVolumeChange({ volume: 0, a: 0, i: 0, u: 0, e: 0, o: 0 });
    }, [onVolumeChange]);

    const cleanup = useCallback(() => {
        stopPlayback();
        const ls = lipsyncRef.current as any;
        if (ls && ls.audioContext) {
            ls.audioContext.close().catch(() => { });
        }
        lipsyncRef.current = null;
    }, [stopPlayback]);

    return { playChunk, stopPlayback, cleanup, initAudio: getContext, isPlaying };
}
