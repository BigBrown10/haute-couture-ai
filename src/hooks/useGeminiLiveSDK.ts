'use client';
import { useRef, useCallback, useState, useEffect } from 'react';
import { HAUTE_AGENTS } from '@/lib/agents';

interface UseGeminiOrchestratorProps {
  onTranscript: (text: string, role: string) => void;
  onAudioChunk: (base64: string) => void;
  onImageReady: (url: string) => void;
  onThinking?: (status: string) => void;
  onError?: (msg: string) => void;
}

export function useGeminiOrchestrator({ onTranscript, onAudioChunk, onImageReady, onThinking, onError }: UseGeminiOrchestratorProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const startAgent = useCallback(async (agentKey: string) => {
    if (socketRef.current) socketRef.current.close();
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`;
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      const persona = (HAUTE_AGENTS as any)[agentKey];

      ws.send(JSON.stringify({
        setup: {
          model: "models/gemini-2.5-flash-native-audio-latest",
          systemInstruction: { parts: [{ text: persona?.instruction || 'AI Fashion Assistant' }] },
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: persona?.voice || 'Aoide' } } }
          },
          tools: [{
            functionDeclarations: [
              {
                name: 'generate_outfit',
                description: 'Generate a Virtual Try-On image overlay. Call this when user asks to see outfit recommendation.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    prompt: { type: 'STRING', description: 'Detailed description of the NEW outfit.' },
                    event_context: { type: 'STRING', description: 'The event or occasion.' }
                  },
                  required: ['prompt', 'event_context']
                }
              },
              {
                name: 'generate_fashion_sketch',
                description: 'Generate a high-fashion sketch or runway concept.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    prompt: { type: 'STRING', description: 'Detailed description of the sketch.' },
                    concept_name: { type: 'STRING', description: 'Name of concept.' }
                  },
                  required: ['prompt', 'concept_name']
                }
              }
            ]
          }]
        }
      }));

      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ clientContent: { turns: [], turnComplete: false } }));
        }
      }, 20000);
    };

    ws.onmessage = async (event) => {
      try {
        const text = typeof event.data === 'string' ? event.data : await (event.data as Blob).text();
        const data = JSON.parse(text);

        if (data.setupComplete) {
          onThinking?.('');
          ws.send(JSON.stringify({
            clientContent: { turns: [{ role: 'user', parts: [{ text: 'Hey! Introduce yourself.' }] }], turnComplete: true }
          }));
          return;
        }

        if (data.serverContent?.modelTurn?.parts) {
          data.serverContent.modelTurn.parts.forEach((part: any) => {
            if (part.text) onTranscript(part.text, 'agent');
            if (part.inlineData?.data) onAudioChunk(part.inlineData.data);

            if (part.functionCall) {
              const call = part.functionCall;
              const callId = call.id;
              const prompt = call.args.prompt;

              onThinking?.('✨ Generating vision...');

              (async () => {
                try {
                  const imageUrl = await callNanoBananaAPI(prompt);
                  onImageReady(imageUrl);
                  onThinking?.('');

                  if (ws.readyState === WebSocket.OPEN) {
                    // Matches your original node backend: just send the success response. No nudges.
                    ws.send(JSON.stringify({
                      toolResponse: {
                        functionResponses: [{ id: callId, name: call.name, response: { success: true, hasImage: true } }]
                      }
                    }));
                  }
                } catch (err) {
                  console.error('[GeminiLive] Tool Execution Error:', err);
                  onThinking?.('');
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                      toolResponse: {
                        functionResponses: [{ id: callId, name: call.name, response: { success: false, error: 'Generation failed.' } }]
                      }
                    }));
                  }
                }
              })();
            }
          });
        }
      } catch (e) { console.error(e); }
    };

    ws.onclose = () => { setConnected(false); if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [onTranscript, onAudioChunk, onImageReady, onThinking]);

  const sendText = useCallback((text: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true }
      }));
    }
  }, []);

  const sendAudio = useCallback((base64: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: base64 }] }
      }));
    }
  }, []);

  const sendFitForCritique = useCallback((base64: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        clientContent: {
          turns: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: base64 } },
              { text: 'I just sent a photo of myself. What do you think?' }
            ]
          }],
          turnComplete: true
        }
      }));
    }
  }, []);

  const sendGarmentPhoto = useCallback((base64: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        clientContent: {
          turns: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: base64 } },
              { text: 'I just sent a photo of a garment. Can you critique it?' }
            ]
          }],
          turnComplete: true
        }
      }));
    }
  }, []);

  return { connected, startAgent, disconnect: () => socketRef.current?.close(), sendText, sendAudio, sendFitForCritique, sendGarmentPhoto };
}

async function callNanoBananaAPI(prompt: string): Promise<string> {
  const res = await fetch('/api/nano-banana', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
  if (!res.ok) throw new Error('Nano Banana 2 failed');
  const data = await res.json();
  return data.url;
}