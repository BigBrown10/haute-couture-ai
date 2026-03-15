'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { TOOLS, executeTool } from '@/lib/tools';
import { ChatMessage } from '@/lib/types';

interface UseGeminiLiveProps {
    onTranscript: (text: string, role: 'agent' | 'user') => void;
    onThought: (text: string) => void;
    onThinking: (status: string) => void;
    onAudioOut: (audioBase64: string) => void; // We keep Base64 to match existing playback hook
    onAgentGesture: (animation: string) => void;
    onError: (msg: string) => void;
}

/**
 * useGeminiLive Hook
 * Connects directly to the Multimodal Live API via WebSockets.
 * Handles the bidirectional audio/text stream and ADK tool calling.
 */
export function useGeminiLive({
    onTranscript,
    onThought,
    onThinking,
    onAudioOut,
    onAgentGesture,
    onError
}: UseGeminiLiveProps) {
    const socketRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);

    const connect = useCallback(async (apiKey: string, config: any) => {
        if (socketRef.current) return;

        // Multimodal Live API Endpoint (v1alpha for current dev features)
        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidirectionalGenerateContent?key=${apiKey}`;

        onThinking('Connecting to Gemini Live...');
        
        try {
            const ws = new WebSocket(url);
            socketRef.current = ws;

            ws.onopen = () => {
                setConnected(true);
                onThinking('');
                
                // Initial setup message
                const setupMessage = {
                    setup: {
                        model: 'models/gemini-2.0-flash-exp',
                        generation_config: {
                            response_modalities: ['AUDIO'],
                        },
                        system_instruction: {
                            parts: [{ text: config.systemInstruction }]
                        },
                        tools: [{ function_declarations: TOOLS }]
                    }
                };
                ws.send(JSON.stringify(setupMessage));
            };

            ws.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                
                // Handle Server Content (Transcript / Audio)
                if (data.serverContent) {
                    const { modelTurn, turnComplete, interrupted } = data.serverContent;
                    
                    if (interrupted) {
                        // Handle interruption logic if needed
                    }

                    if (modelTurn) {
                        for (const part of modelTurn.parts) {
                            if (part.text) {
                                // Extract thoughts if formatted with **
                                const thoughtMatch = part.text.match(/\*\*([\s\S]*?)\*\*/);
                                if (thoughtMatch) {
                                    onThought(thoughtMatch[1]);
                                }
                                onTranscript(part.text, 'agent');
                            }
                            if (part.inlineData && part.inlineData.mimeType === 'audio/pcm;rate=24000') {
                                onAudioOut(part.inlineData.data);
                            }
                        }
                    }
                }

                // Handle Tool Calls (ADK Pattern)
                if (data.toolCall) {
                    for (const call of data.toolCall.functionCalls) {
                        const result = await executeTool(call.name, call.args, {
                            onThinking,
                            onAgentGesture,
                            onGeneratedOutfit: (img: string | null, cap: string) => {
                                // This would normally update the message list, but since tool results 
                                // are sent back to Gemini, we just signal it.
                            }
                        });
                        
                        // Send Tool Response
                        const response = {
                            tool_response: {
                                function_responses: [{
                                    name: call.name,
                                    response: result,
                                    id: call.id
                                }]
                            }
                        };
                        ws.send(JSON.stringify(response));

                        // If tool was trigger_gesture, notify UI
                        if (call.name === 'trigger_gesture') {
                            onAgentGesture(call.args.animation);
                        }
                    }
                }
            };

            ws.onerror = (err) => {
                console.error('[GeminiLive] Connection error:', err);
                onError('WebSocket connection failed');
            };

            ws.onclose = () => {
                setConnected(false);
                socketRef.current = null;
            };

        } catch (err) {
            console.error('[GeminiLive] Setup failed:', err);
            onError('Failed to initialize Gemini Live');
        }
    }, [onThought, onTranscript, onAudioOut, onThinking, onAgentGesture, onError]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        setConnected(false);
    }, []);

    const sendAudio = useCallback((base64: string) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
        
        socketRef.current.send(JSON.stringify({
            realtime_input: {
                media_chunks: [{
                    mime_type: 'audio/pcm;rate=16000',
                    data: base64
                }]
            }
        }));
    }, []);

    const sendText = useCallback((text: string) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
        
        socketRef.current.send(JSON.stringify({
            client_content: {
                turns: [{
                    role: 'user',
                    parts: [{ text }]
                }],
                turn_complete: true
            }
        }));
    }, []);

    return { connected, connect, disconnect, sendAudio, sendText };
}
