/**
 * Vision Pipeline — Nano Banana 2 (gemini-3.1-flash-image-preview)
 *
 * Generates outfit images using the actual Nano Banana 2 model.
 * Supports multi-image reference for virtual try-on workflows.
 */

import { GoogleGenAI, type Part } from '@google/genai';

const VISION_MODEL = 'gemini-3.1-flash-image-preview';

interface GenerateOutfitParams {
    prompt: string;
    eventContext: string;
    styleNotes?: string;
    userFrameBase64?: string;
}

interface GenerateOutfitResult {
    imageBase64: string | null;
    caption: string;
    error?: string;
}

/**
 * Generate a high-fidelity outfit image using Nano Banana 2.
 */
export async function generateOutfitImage(
    params: GenerateOutfitParams
): Promise<GenerateOutfitResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.warn('[VisionPipeline] No GEMINI_API_KEY — returning mock');
        return getMockResult(params);
    }

    try {
        const genAI = new GoogleGenAI({ apiKey });
        const fullPrompt = buildGenerationPrompt(params);

        // Build parts array
        const parts: Part[] = [{ text: fullPrompt }];

        // Include user frame for virtual try-on if available
        if (params.userFrameBase64) {
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: params.userFrameBase64,
                },
            });
        }

        console.log('[VisionPipeline] Generating with', VISION_MODEL, '...');

        const response = await genAI.models.generateContent({
            model: VISION_MODEL,
            contents: [{ role: 'user', parts }],
            config: {
                responseModalities: ['TEXT', 'IMAGE'] as any,
            },
        });

        // Extract image and text from response
        const candidate = response.candidates?.[0];
        if (!candidate?.content?.parts) {
            console.warn('[VisionPipeline] No candidate parts in response');
            return {
                imageBase64: null,
                caption: 'Vision model returned no content — possible safety filter block.',
                error: 'empty_response',
            };
        }

        let imageBase64: string | null = null;
        let caption = '';

        for (const part of candidate.content.parts) {
            if (part.inlineData?.data) {
                imageBase64 = part.inlineData.data;
                console.log('[VisionPipeline] ✅ Got image data, size:', imageBase64.length);
            }
            if (part.text) {
                caption = part.text;
            }
        }

        if (!imageBase64) {
            return {
                imageBase64: null,
                caption: caption || 'Image blocked by safety filters. Try a different description.',
                error: 'safety_filter',
            };
        }

        return {
            imageBase64,
            caption: caption || `Generated: ${params.prompt.substring(0, 100)}`,
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[VisionPipeline] Generation failed:', message);
        return {
            imageBase64: null,
            caption: `[Error] ${message.substring(0, 200)}`,
            error: message,
        };
    }
}

function buildGenerationPrompt(params: GenerateOutfitParams): string {
    const lines = [
        'Generate a high-end, editorial fashion photograph of the following outfit.',
        'Style: Professional runway photography, clean studio background, perfect lighting.',
        'Aspect ratio: vertical portrait (9:16).',
        '',
        `Event / Occasion: ${params.eventContext}`,
        `Outfit: ${params.prompt}`,
    ];

    if (params.styleNotes) {
        lines.push(`Styling Notes: ${params.styleNotes}`);
    }

    if (params.userFrameBase64) {
        lines.push(
            '',
            'The attached image shows the user. Generate the recommended outfit styled for a similar body type.',
            'Preserve natural lighting and render against an elegant background.',
        );
    }

    lines.push(
        '',
        'Requirements:',
        '- Realistic fabric textures with visible weave and drape',
        '- Editorial lighting (soft key light, rim accent)',
        '- The outfit should communicate luxury and intentional design',
        '- Full body or three-quarter length shot',
    );

    return lines.join('\n');
}

function getMockResult(params: GenerateOutfitParams, error?: string): GenerateOutfitResult {
    return {
        imageBase64: null,
        caption: `[DEMO] Outfit for ${params.eventContext}: ${params.prompt.substring(0, 120)}`,
        error: error || 'no_api_key',
    };
}
