'use client';
import { useRef, useCallback, useState, useEffect } from 'react';

/**
 * Hook to capture microphone audio as PCM 16-bit 16kHz mono chunks.
 * Uses an INLINE AudioWorklet for bulletproof, self-contained processing.
 */
export function useAudioCapture(onAudioData: (base64: string) => void, onVolumeChange?: (volume: number) => void) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const onAudioDataRef = useRef(onAudioData);
  const onVolumeRef = useRef(onVolumeChange);

  useEffect(() => {
    onAudioDataRef.current = onAudioData;
    onVolumeRef.current = onVolumeChange;
  }, [onAudioData, onVolumeChange]);

  const startCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: 16000 },
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContextClass({ sampleRate: 16000 }); // Force 16kHz

      if (context.state === 'suspended') {
        await context.resume();
      }
      audioContextRef.current = context;

      // 🔥 THE BULLETPROOF INLINE WORKLET: No external files to break!
      const workletCode = `
        class PCMCaptureProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const input = inputs[0];
            if (!input || !input[0]) return true;
            
            const channelData = input[0];
            const pcm16 = new Int16Array(channelData.length);
            let sum = 0;
            
            for (let i = 0; i < channelData.length; i++) {
              sum += Math.abs(channelData[i]);
              const s = Math.max(-1, Math.min(1, channelData[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            
            this.port.postMessage({ buffer: pcm16.buffer, volume: sum / channelData.length }, [pcm16.buffer]);
            return true;
          }
        }
        registerProcessor('pcm-capture-processor', PCMCaptureProcessor);
      `;

      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await context.audioWorklet.addModule(workletUrl);

      const source = context.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(context, 'pcm-capture-processor');
      workletRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        const { buffer, volume } = event.data;

        if (onVolumeRef.current) {
          onVolumeRef.current(volume);
        }

        const uint8 = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < uint8.byteLength; i++) {
          binary += String.fromCharCode(uint8[i]);
        }

        if (onAudioDataRef.current) {
          onAudioDataRef.current(window.btoa(binary));
        }
      };

      source.connect(workletNode);
      workletNode.connect(context.destination);
      setIsCapturing(true);
    } catch (err) {
      console.error('[AudioCapture] Failed to start microphone:', err);
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (workletRef.current) {
      workletRef.current.port.postMessage('stop');
      workletRef.current.disconnect();
      workletRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  return { startCapture, stopCapture, isCapturing };
}