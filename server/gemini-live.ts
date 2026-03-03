/**
 * Gemini Live API Client — Callback-Based Implementation
 *
 * Uses gemini-2.5-flash-native-audio-latest for real-time
 * bidirectional voice + video conversation with the fashion stylist.
 * Messages from the Live API are received via the onmessage callback.
 */

import { GoogleGenAI, type Session, type LiveServerMessage, type Content } from '@google/genai';
import { PERSONA_SYSTEM_PROMPT, GENERATE_OUTFIT_TOOL, SAFETY_SETTINGS } from './persona-prompt';
import { generateOutfitImage } from './vision-pipeline';

const LIVE_MODEL = 'gemini-2.5-flash-native-audio-latest';

export interface LiveSessionCallbacks {
    onAudioOut: (audioBase64: string) => void;
    onTranscript: (text: string, role: 'agent' | 'user') => void;
    onGeneratedOutfit: (imageBase64: string | null, caption: string) => void;
    onThinking: (status: string) => void;
    onError: (error: string) => void;
    onInterrupted: () => void;
}

export class GeminiLiveSession {
    private session: Session | null = null;
    private callbacks: LiveSessionCallbacks;
    private latestVideoFrame: string | null = null;
    private isConnected = false;
    private voiceName: string;

    constructor(callbacks: LiveSessionCallbacks, voiceName: string = 'Despina') {
        this.callbacks = callbacks;
        this.voiceName = voiceName;
    }

    async connect(): Promise<boolean> {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is required');
        }

        try {
            const genAI = new GoogleGenAI({ apiKey });

            this.callbacks.onThinking('Connecting to Gemini Live API...');

            this.session = await genAI.live.connect({
                model: LIVE_MODEL,
                config: {
                    responseModalities: ['AUDIO'] as any,
                    systemInstruction: {
                        parts: [{ text: PERSONA_SYSTEM_PROMPT }],
                    },
                    tools: [{ functionDeclarations: [GENERATE_OUTFIT_TOOL] }],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: this.voiceName,
                            },
                        },
                    },
                } as any,
                callbacks: {
                    onopen: () => {
                        this.isConnected = true;
                        console.log('[GeminiLive] ✅ WebSocket opened');
                        this.callbacks.onThinking('Connected — the stylist is watching...');
                    },
                    onmessage: (message: LiveServerMessage) => {
                        this.handleMessage(message);
                    },
                    onerror: (error: ErrorEvent) => {
                        console.error('[GeminiLive] WebSocket error:', error.message || error);
                        this.callbacks.onError('Live API connection error');
                    },
                    onclose: (event: CloseEvent) => {
                        this.isConnected = false;
                        console.log('[GeminiLive] WebSocket closed:', event.code, event.reason);
                        this.callbacks.onThinking('');
                    },
                },
            });

            this.isConnected = true;
            console.log('[GeminiLive] ✅ Connected to', LIVE_MODEL, 'with voice', this.voiceName);
            return true;

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[GeminiLive] Connection failed:', message);
            this.callbacks.onError(`Live API connection failed: ${message}`);
            return false;
        }
    }

    /**
     * Send raw audio data (PCM 16-bit 16kHz mono) to the Live API.
     */
    sendAudio(audioBase64: string): void {
        if (!this.session || !this.isConnected) return;

        try {
            this.session.sendRealtimeInput({
                audio: {
                    data: audioBase64,
                    mimeType: 'audio/pcm;rate=16000',
                },
            });
        } catch (error) {
            console.error('[GeminiLive] Error sending audio:', error);
        }
    }

    /**
     * Send a video frame (Base64 JPEG) to the Live API.
     */
    sendVideoFrame(frameBase64: string): void {
        if (!this.session || !this.isConnected) return;

        this.latestVideoFrame = frameBase64;

        try {
            this.session.sendRealtimeInput({
                video: {
                    data: frameBase64,
                    mimeType: 'image/jpeg',
                },
            });
        } catch (error) {
            console.error('[GeminiLive] Error sending video frame:', error);
        }
    }

    /**
     * Send a text message to the Live API (for text-based interaction).
     */
    async sendText(text: string): Promise<void> {
        if (!this.session || !this.isConnected) return;

        try {
            await this.session.sendClientContent({
                turns: [
                    {
                        role: 'user',
                        parts: [{ text }],
                    } as Content,
                ],
                turnComplete: true,
            });
        } catch (error) {
            console.error('[GeminiLive] Error sending text:', error);
        }
    }

    /**
     * Handle an incoming message from the Live API (via onmessage callback).
     */
    private async handleMessage(message: LiveServerMessage): Promise<void> {
        try {
            // Handle server content (audio + text responses)
            if (message.serverContent) {
                const content = message.serverContent;

                if (content.interrupted) {
                    console.log('[GeminiLive] Agent was interrupted by user');
                    this.callbacks.onInterrupted();
                }

                const parts = content.modelTurn?.parts;
                if (parts) {
                    for (const part of parts) {
                        // Text response
                        if (part.text) {
                            this.callbacks.onTranscript(part.text, 'agent');
                        }

                        // Audio response
                        if (part.inlineData) {
                            const mimeType = part.inlineData.mimeType || '';
                            if (mimeType.startsWith('audio/')) {
                                if (part.inlineData.data) {
                                    this.callbacks.onAudioOut(part.inlineData.data);
                                }
                            }
                        }
                    }
                }

                // Turn completion
                if (content.turnComplete) {
                    this.callbacks.onThinking('');
                }
            }

            // Handle function calls (tool invocations — e.g., generate_outfit)
            if (message.toolCall) {
                const calls = message.toolCall.functionCalls;
                if (calls) {
                    for (const call of calls) {
                        if (call.name === 'generate_outfit') {
                            await this.handleGenerateOutfit({
                                id: call.id,
                                name: call.name,
                                args: call.args,
                            });
                        }
                    }
                }
            }

            // Handle setup complete
            if (message.setupComplete) {
                console.log('[GeminiLive] Setup complete — session ready');
                this.callbacks.onThinking('Connected — the stylist is watching...');
            }
        } catch (error) {
            console.error('[GeminiLive] Error handling message:', error);
        }
    }

    /**
     * Handle the generate_outfit function call from the Live API.
     */
    private async handleGenerateOutfit(call: { id?: string; name: string; args?: Record<string, unknown> }): Promise<void> {
        const args = (call.args || {}) as Record<string, string>;

        this.callbacks.onThinking('✨ Generating outfit recommendation...');

        const result = await generateOutfitImage({
            prompt: args.prompt || 'A sophisticated, well-tailored outfit',
            eventContext: args.event_context || 'general styling',
            styleNotes: args.style_notes,
            userFrameBase64: this.latestVideoFrame || undefined,
        });

        this.callbacks.onGeneratedOutfit(result.imageBase64, result.caption);
        this.callbacks.onThinking('');

        // Send function response back to the Live API
        if (this.session && this.isConnected) {
            try {
                await this.session.sendToolResponse({
                    functionResponses: [
                        {
                            id: call.id || 'unknown',
                            name: 'generate_outfit',
                            response: {
                                success: !result.error,
                                caption: result.caption,
                                hasImage: !!result.imageBase64,
                            },
                        },
                    ],
                });
            } catch (error) {
                console.error('[GeminiLive] Error sending tool response:', error);
            }
        }
    }

    disconnect(): void {
        this.isConnected = false;
        if (this.session) {
            try {
                this.session.close();
            } catch {
                // Ignore close errors
            }
            this.session = null;
        }
        console.log('[GeminiLive] Disconnected');
    }

    get connected(): boolean {
        return this.isConnected;
    }
}
