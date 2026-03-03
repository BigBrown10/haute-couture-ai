'use client';

import { useRef, useCallback, useState } from 'react';

/**
 * Hook to capture microphone audio as PCM 16-bit 16kHz mono chunks.
 *
 * Uses AudioWorklet for low-latency capture in the audio thread,
 * then resamples from the browser's native sample rate (usually 48kHz)
 * down to 16kHz as required by the Gemini Live API.
 */
export function useAudioCapture(onAudioChunk: (base64: string) => void, onVolumeChange?: (volume: number) => void) {
    const audioContextRef = useRef<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const startCapture = useCallback(async () => {
        try {
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

            const audioContext = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = audioContext;

            const nativeSampleRate = audioContext.sampleRate;

            // Add Analyser for volume detection
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            await audioContext.audioWorklet.addModule('/audio-worklet-processor.js');

            const source = audioContext.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(audioContext, 'pcm-capture-processor');
            workletNodeRef.current = workletNode;

            workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
                const pcmBuffer = event.data;
                const base64 = nativeSampleRate !== 16000
                    ? arrayBufferToBase64(resamplePCM(pcmBuffer, nativeSampleRate, 16000))
                    : arrayBufferToBase64(pcmBuffer);
                onAudioChunk(base64);
            };

            source.connect(analyser); // Connect to analyser
            analyser.connect(workletNode);

            // Volume analysis loop
            if (onVolumeChange) {
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                const updateVolume = () => {
                    analyser.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        sum += dataArray[i];
                    }
                    const average = sum / dataArray.length;
                    onVolumeChange(average / 128); // Normalized 0-1
                    animationFrameRef.current = requestAnimationFrame(updateVolume);
                };
                updateVolume();
            }

            setIsCapturing(true);
        } catch (err) {
            console.error('[AudioCapture] Failed to start:', err);
            setIsCapturing(false);
        }
    }, [onAudioChunk, onVolumeChange]);

    const stopCapture = useCallback(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (workletNodeRef.current) {
            workletNodeRef.current.port.postMessage('stop');
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }
        if (analyserRef.current) analyserRef.current.disconnect();
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setIsCapturing(false);
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
