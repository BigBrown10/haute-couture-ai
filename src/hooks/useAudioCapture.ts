'use client';

import { useRef, useCallback, useState } from 'react';

/**
 * Hook to capture microphone audio as PCM 16-bit 16kHz mono chunks.
 *
 * Uses AudioWorklet for low-latency capture in the audio thread,
 * then resamples from the browser's native sample rate (usually 48kHz)
 * down to 16kHz as required by the Gemini Live API.
 */
export function useAudioCapture(onAudioChunk: (base64: string) => void) {
    const audioContextRef = useRef<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const startCapture = useCallback(async () => {
        try {
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: { ideal: 16000 },
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            streamRef.current = stream;

            // Create AudioContext
            const audioContext = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = audioContext;

            // If browser doesn't support 16kHz, we'll resample
            const nativeSampleRate = audioContext.sampleRate;
            console.log('[AudioCapture] Native sample rate:', nativeSampleRate);

            // Load the AudioWorklet processor
            await audioContext.audioWorklet.addModule('/audio-worklet-processor.js');

            // Create source and worklet
            const source = audioContext.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(audioContext, 'pcm-capture-processor');
            workletNodeRef.current = workletNode;

            // Handle PCM data from the worklet
            workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
                const pcmBuffer = event.data;

                if (nativeSampleRate !== 16000) {
                    // Resample to 16kHz
                    const resampled = resamplePCM(pcmBuffer, nativeSampleRate, 16000);
                    const base64 = arrayBufferToBase64(resampled);
                    onAudioChunk(base64);
                } else {
                    const base64 = arrayBufferToBase64(pcmBuffer);
                    onAudioChunk(base64);
                }
            };

            // Connect: mic → worklet
            source.connect(workletNode);
            // Don't connect worklet to destination (we don't want to hear ourselves)

            setIsCapturing(true);
            console.log('[AudioCapture] ✅ Started');
        } catch (err) {
            console.error('[AudioCapture] Failed to start:', err);
            setIsCapturing(false);
        }
    }, [onAudioChunk]);

    const stopCapture = useCallback(() => {
        if (workletNodeRef.current) {
            workletNodeRef.current.port.postMessage('stop');
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }

        setIsCapturing(false);
        console.log('[AudioCapture] Stopped');
    }, []);

    return { startCapture, stopCapture, isCapturing };
}

/**
 * Resample 16-bit PCM from one sample rate to another.
 */
function resamplePCM(buffer: ArrayBuffer, fromRate: number, toRate: number): ArrayBuffer {
    const input = new Int16Array(buffer);
    const ratio = fromRate / toRate;
    const outputLength = Math.round(input.length / ratio);
    const output = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
        const srcIndex = i * ratio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
        const frac = srcIndex - srcIndexFloor;

        // Linear interpolation
        output[i] = Math.round(input[srcIndexFloor] * (1 - frac) + input[srcIndexCeil] * frac);
    }

    return output.buffer;
}

/**
 * Convert ArrayBuffer to Base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
