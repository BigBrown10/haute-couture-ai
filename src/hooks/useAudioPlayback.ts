'use client';

import { useRef, useCallback, useState } from 'react';

export interface VisemeData {
    volume: number;
    a: number;
    i: number;
    u: number;
    e: number;
    o: number;
}

/**
 * Hook to play incoming PCM audio from the Gemini Live API.
 * Uses an AnalyserNode to construct a VisemeData object for true lip-sync.
 */
export function useAudioPlayback(onVolumeChange?: (visemes: VisemeData) => void) {
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const queueRef = useRef<AudioBufferSourceNode[]>([]);
    const nextStartTimeRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const PLAYBACK_SAMPLE_RATE = 24000;

    const getContext = useCallback(() => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            const ctx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
            audioContextRef.current = ctx;

            // Add Analyser for volume detection
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            analyser.connect(ctx.destination);
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const playChunk = useCallback((audioBase64: string) => {
        try {
            const ctx = getContext();
            const analyser = analyserRef.current!;

            const binaryStr = atob(audioBase64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }
            const int16 = new Int16Array(bytes.buffer);

            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 32768;
            }

            const audioBuffer = ctx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
            audioBuffer.getChannelData(0).set(float32);

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(analyser); // Connect to analyser instead of direct destination

            const now = ctx.currentTime;
            const startTime = Math.max(now, nextStartTimeRef.current);
            source.start(startTime);
            nextStartTimeRef.current = startTime + audioBuffer.duration;

            queueRef.current.push(source);
            source.onended = () => {
                queueRef.current = queueRef.current.filter((s) => s !== source);
                if (queueRef.current.length === 0) {
                    setIsPlaying(false);
                    if (onVolumeChange) onVolumeChange({ volume: 0, a: 0, i: 0, u: 0, e: 0, o: 0 });
                }
            };

            // Volume & Viseme analysis loop using FFT
            if (onVolumeChange && !animationFrameRef.current) {
                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                const updateVolume = () => {
                    if (queueRef.current.length > 0) {
                        analyser.getByteFrequencyData(dataArray);

                        let totalVol = 0;
                        let bandU = 0; // low: 0-500 Hz
                        let bandA = 0; // mid: 500-1500 Hz
                        let bandI = 0; // high: 1500-3000 Hz

                        for (let i = 0; i < dataArray.length; i++) {
                            const val = dataArray[i];
                            totalVol += val;
                            if (i > 1 && i <= 5) bandU += val;
                            else if (i > 5 && i <= 16) bandA += val;
                            else if (i > 16 && i <= 32) bandI += val;
                        }

                        // Normalize metrics
                        const volume = (totalVol / dataArray.length) / 128;
                        const u = (bandU / 4) / 255;
                        const a = (bandA / 11) / 255;
                        const i = (bandI / 16) / 255;

                        onVolumeChange({
                            volume,
                            a: Math.min(1.0, a * 1.5), // Boost specific bandwidths to clarify mouth shapes
                            i: Math.min(1.0, i * 2.0),
                            u: Math.min(1.0, u * 1.2),
                            e: Math.min(1.0, i * 1.5), // e is similar to i
                            o: Math.min(1.0, u * 1.5), // o is similar to u
                        });
                        animationFrameRef.current = requestAnimationFrame(updateVolume);
                    } else {
                        onVolumeChange({ volume: 0, a: 0, i: 0, u: 0, e: 0, o: 0 });
                        animationFrameRef.current = null;
                    }
                };
                updateVolume();
            }

            setIsPlaying(true);
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
        if (onVolumeChange) onVolumeChange({ volume: 0, a: 0, i: 0, u: 0, e: 0, o: 0 });
    }, [onVolumeChange]);

    const cleanup = useCallback(() => {
        stopPlayback();
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
    }, [stopPlayback]);

    return { playChunk, stopPlayback, cleanup, isPlaying };
}
