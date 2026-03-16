'use client';
import { useRef, useCallback, useState, useEffect } from 'react';

interface UseGeminiLiveProps {
  onTranscript: (text: string, role: 'agent' | 'user') => void;
  onAudioChunk: (chunk: Int16Array) => void;
  onThinking?: (status: string) => void;
  onError?: (msg: string) => void;
}

/**
 * useGeminiLive Hook - [v1alpha Native Audio 2.5 Final]
 * Optimized for Gemini 2.5 Flash Native Audio with lipsync bridge.
 */
export function useGeminiLive({ onTranscript, onAudioChunk, onThinking, onError }: UseGeminiLiveProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(async (apiKey: string) => {
    if (socketRef.current) socketRef.current.close();

    // 1. STABLE 2026 BIDI ENDPOINT
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    console.log('[GeminiLive] 📡 Connecting to v1alpha BidiGenerateContent...');
    
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('[GeminiLive] 📡 WebSocket Open. Syncing Setup...');
      setConnected(true);
      
      const setup = {
        setup: {
          // 2. THE MODEL STRING FROM YOUR CONSOLE FETCH
          model: 'models/gemini-2.5-flash-native-audio-latest', 
          generationConfig: { responseModalities: ['AUDIO'] }
        }
      };
      ws.send(JSON.stringify(setup));
    };

    ws.onmessage = async (event) => {
      try {
        const text = typeof event.data === 'string' ? event.data : await (event.data as Blob).text();
        const data = JSON.parse(text);
        
        if (data.setupComplete) {
          console.log('[GeminiLive] 🎊 SETUP ACKNOWLEDGED.');
          onThinking?.('Online');
        }

        if (data.serverContent?.modelTurn?.parts) {
          data.serverContent.modelTurn.parts.forEach((p: any) => {
            if (p.text) onTranscript(p.text, 'agent');
            if (p.inlineData) {
              // Convert Base64 Audio to PCM for the Wawa Player (Lipsync bridge)
              const b = atob(p.inlineData.data);
              const u = new Uint8Array(b.length);
              for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
              onAudioChunk(new Int16Array(u.buffer));
            }
          });
        }
      } catch (e) {
        console.error('[GeminiLive] Message processing error:', e);
      }
    };

    ws.onclose = (e) => {
      console.log(`[GeminiLive] 🔌 Closed | Code: ${e.code}`);
      setConnected(false);
      socketRef.current = null;
    };

    ws.onerror = (e) => {
      console.error('[GeminiLive] WebSocket Error:', e);
      onError?.('Connection Error');
    };
  }, [onTranscript, onAudioChunk, onThinking, onError]);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
  }, []);

  const sendAudio = useCallback((base64: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: 'audio/pcm;rate=16000',
            data: base64
          }]
        }
      }));
    }
  }, []);

  const sendText = useCallback((text: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        clientContent: {
          turns: [{
            role: 'user',
            parts: [{ text }]
          }],
          turnComplete: true
        }
      }));
    }
  }, []);

  useEffect(() => {
    return () => socketRef.current?.close();
  }, []);

  return { connected, connect, disconnect, sendAudio, sendText };
}
