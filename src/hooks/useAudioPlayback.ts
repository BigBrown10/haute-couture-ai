'use client';

import { useRef, useCallback, useState } from 'react';

/**
 * Hook to play incoming PCM audio from the Gemini Live API.
 *
 * Receives Base64-encoded PCM 24kHz 16-bit mono chunks,
 * decodes them, and plays through Web Audio API.
 * Supports barge-in: stops playback when user interrupts.
 */
export function useAudioPlayback() {
    const audioContextRef = useRef<AudioContext | null>(null);
    const queueRef = useRef<AudioBufferSourceNode[]>([]);
    const nextStartTimeRef = useRef(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const PLAYBACK_SAMPLE_RATE = 24000; // Gemini outputs 24kHz

    const getContext = useCallback(() => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    /**
     * Enqueue a Base64 PCM chunk for playback.
     */
    const playChunk = useCallback((audioBase64: string) => {
        try {
            const ctx = getContext();

            // Decode Base64 to Int16 PCM
            const binaryStr = atob(audioBase64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }
            const int16 = new Int16Array(bytes.buffer);

            // Convert Int16 to Float32 for Web Audio
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 32768;
            }

            // Create AudioBuffer
            const audioBuffer = ctx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
            audioBuffer.getChannelData(0).set(float32);

            // Create source node
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);

            // Schedule seamless playback
            const now = ctx.currentTime;
            const startTime = Math.max(now, nextStartTimeRef.current);
            source.start(startTime);
            nextStartTimeRef.current = startTime + audioBuffer.duration;

            // Track for barge-in
            queueRef.current.push(source);
            source.onended = () => {
                queueRef.current = queueRef.current.filter((s) => s !== source);
                if (queueRef.current.length === 0) {
                    setIsPlaying(false);
                }
            };

            setIsPlaying(true);
        } catch (err) {
            console.error('[AudioPlayback] Error playing chunk:', err);
        }
    }, [getContext]);

    /**
     * Stop all current playback immediately (barge-in).
     */
    const stopPlayback = useCallback(() => {
        for (const source of queueRef.current) {
            try {
                source.stop();
            } catch {
                // Already stopped
            }
        }
        queueRef.current = [];
        nextStartTimeRef.current = 0;
        setIsPlaying(false);
    }, []);

    /**
     * Clean up the audio context entirely.
     */
    const cleanup = useCallback(() => {
        stopPlayback();
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
    }, [stopPlayback]);

    return { playChunk, stopPlayback, cleanup, isPlaying };
}
