/**
 * Gemini Live API Client — Callback-Based Implementation
 *
 * Uses gemini-2.5-flash-native-audio-latest for real-time
 * bidirectional voice + video conversation with the fashion stylist.
 * Messages from the Live API are received via the onmessage callback.
 */

import { GoogleGenAI, type Session, type LiveServerMessage, type Content } from '@google/genai';
import { PERSONA_SYSTEM_PROMPT, DESIGNER_SYSTEM_PROMPT, TONY_SYSTEM_PROMPT, GINA_SYSTEM_PROMPT, ARIA_SYSTEM_PROMPT, GENERATE_OUTFIT_TOOL, GENERATE_SKETCH_TOOL, SAFETY_SETTINGS } from './persona-prompt';
import { generateOutfitImage, generateFashionSketch } from './vision-pipeline';

const LIVE_MODEL = 'gemini-2.5-flash-native-audio-latest';

export interface LiveSessionCallbacks {
    onAudioOut: (audioBase64: string) => void;
    onTranscript: (text: string, role: 'agent' | 'user') => void;
    onGeneratedOutfit: (imageBase64: string | null, caption: string) => void;
    onThinking: (status: string) => void;
    onError: (error: string) => void;
    onInterrupted: () => void;
}

export type AgentMode = 'stylist' | 'designer';

export class GeminiLiveSession {
    private session: Session | null = null;
    private callbacks: LiveSessionCallbacks;
    // Track state for virtual try-on payload construction
    private latestUserFrame: string | null = null;
    private latestGarmentFrame: string | null = null;
    private turnGenerationCount: number = 0;
    private isConnected = false;
    private voiceName: string;
    private mode: AgentMode;

    constructor(callbacks: LiveSessionCallbacks, voiceName: string = 'Kore', mode: AgentMode = 'stylist') {
        this.callbacks = callbacks;
        this.voiceName = voiceName;
        this.mode = mode;
    }

    async connect(): Promise<boolean> {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is required');
        }

        try {
            const genAI = new GoogleGenAI({ apiKey });

            const isDesigner = this.mode === 'designer';
            this.callbacks.onThinking(`Connecting to Gemini Live API (${isDesigner ? 'Designer' : 'Stylist'} Mode)...`);

            let systemPrompt = PERSONA_SYSTEM_PROMPT;
            if (isDesigner) {
                systemPrompt = DESIGNER_SYSTEM_PROMPT;
            } else if (this.voiceName === 'Puck') {
                systemPrompt = TONY_SYSTEM_PROMPT;
            } else if (this.voiceName === 'Aoede') {
                systemPrompt = GINA_SYSTEM_PROMPT;
            } else if (this.voiceName === 'Charon') {
                systemPrompt = ARIA_SYSTEM_PROMPT;
            }

            this.session = await genAI.live.connect({
                model: LIVE_MODEL,
                config: {
                    responseModalities: ['AUDIO'] as any,
                    systemInstruction: {
                        parts: [{ text: systemPrompt }],
                    },
                    tools: [{ functionDeclarations: [isDesigner ? GENERATE_SKETCH_TOOL : GENERATE_OUTFIT_TOOL] }],
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
                        console.log(`[GeminiLive] ✅ WebSocket opened in ${this.mode} mode`);
                        this.callbacks.onThinking(`Connected — ${isDesigner ? 'the atelier is open' : 'the stylist is watching'}...`);
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
            console.log(`[GeminiLive] ✅ Connected to ${LIVE_MODEL} as ${this.mode}`);
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
     * Send a video frame (Base64 JPEG) to the Live API as the primary user subject.
     */
    sendUserFrame(frameBase64: string): void {
        if (!this.session || !this.isConnected) return;

        this.latestUserFrame = frameBase64;

        try {
            this.session.sendRealtimeInput({
                video: {
                    data: frameBase64,
                    mimeType: 'image/jpeg',
                },
            });
        } catch (error) {
            console.error('[GeminiLive] Error sending user frame:', error);
        }
    }

    /**
     * Store a garment photo to be used as a reference/target for Virtual Try-On.
     * We don't send this as a video frame to Gemini to prevent disrupting the face/identity context.
     * Instead, it waits here until the generate_outfit tool is invoked.
     */
    sendGarmentFrame(frameBase64: string): void {
        this.latestGarmentFrame = frameBase64;
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
                    this.turnGenerationCount = 0; // Reset tool limit per conversational turn
                }
            }

            // Handle function calls (tool invocations)
            if (message.toolCall) {
                const calls = message.toolCall.functionCalls;
                if (calls) {
                    for (const call of calls) {
                        const callName = call.name || 'unknown';
                        if (callName === 'generate_outfit') {
                            await this.handleGenerateOutfit({ id: call.id, name: callName, args: call.args });
                        } else if (callName === 'generate_fashion_sketch') {
                            await this.handleGenerateSketch({ id: call.id, name: callName, args: call.args });
                        }
                    }
                }
            }

            // Handle setup complete
            if (message.setupComplete) {
                console.log('[GeminiLive] Setup complete — session ready');
                this.callbacks.onThinking(`Connected — ${this.mode === 'designer' ? 'the atelier is open' : 'the stylist is watching'}...`);
            }
        } catch (error) {
            console.error('[GeminiLive] Error handling message:', error);
        }
    }

    /**
     * Handle the generate_outfit function call from the Live API.
     */
    private async handleGenerateOutfit(call: { id?: string; name: string; args?: Record<string, unknown> }): Promise<void> {
        if (this.turnGenerationCount >= 2) {
            console.warn('[GeminiLive] Hard-blocking extra outfit generation: limit reached (2).');
            await this.sendToolResponse(call.id || 'unknown', 'generate_outfit', {
                error: "SYSTEM OVERRIDE: 2-image maximum reached. You MUST stop generating and interact with the user.",
                caption: "",
                imageBase64: null
            });
            return;
        }
        this.turnGenerationCount++;

        const args = (call.args || {}) as Record<string, string>;

        this.callbacks.onThinking('✨ Generating Virtual Try-On overlay...');

        const result = await generateOutfitImage({
            prompt: args.prompt || 'A sophisticated, well-tailored outfit',
            eventContext: args.event_context || 'general styling',
            styleNotes: args.style_notes,
            userFrameBase64: this.latestUserFrame || undefined,
            garmentFrameBase64: this.latestGarmentFrame || undefined,
        });

        // Optional: clear garment after it's been processed, or let them reuse it.
        // We will keep it so the user can iterate on the same garment.

        this.callbacks.onGeneratedOutfit(result.imageBase64, result.caption);
        this.callbacks.onThinking('');

        // Send function response back
        await this.sendToolResponse(call.id || 'unknown', 'generate_outfit', result);
    }

    /**
     * Handle the generate_fashion_sketch function call from the Live API.
     */
    private async handleGenerateSketch(call: { id?: string; name: string; args?: Record<string, unknown> }): Promise<void> {
        if (this.turnGenerationCount >= 2) {
            console.warn('[GeminiLive] Hard-blocking extra sketch generation: limit reached (2).');
            await this.sendToolResponse(call.id || 'unknown', 'generate_fashion_sketch', {
                error: "SYSTEM OVERRIDE: 2-sketch maximum reached. You MUST stop generating and interact with the user.",
                caption: "",
                imageBase64: null
            });
            return;
        }
        this.turnGenerationCount++;

        const args = (call.args || {}) as Record<string, string>;

        this.callbacks.onThinking('🎨 Sketching haute couture concept...');

        const result = await generateFashionSketch({
            prompt: args.prompt || 'Avant-garde fashion silhouette',
            conceptName: args.concept_name || 'Untitled masterpiece',
        });

        // We reuse the onGeneratedOutfit callback since the frontend just needs to display the image
        this.callbacks.onGeneratedOutfit(result.imageBase64, result.caption);
        this.callbacks.onThinking('');

        // Send function response back
        await this.sendToolResponse(call.id || 'unknown', 'generate_fashion_sketch', result);
    }

    private async sendToolResponse(id: string, name: string, result: { error?: string; caption: string; imageBase64: string | null }) {
        if (this.session && this.isConnected) {
            try {
                await this.session.sendToolResponse({
                    functionResponses: [
                        {
                            id,
                            name,
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
