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

export async function generateFashionSketch(
    params: { prompt: string; conceptName: string }
): Promise<GenerateOutfitResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return getMockResult({ prompt: params.prompt, eventContext: 'sketch' });

    try {
        const genAI = new GoogleGenAI({ apiKey });
        const fullPrompt = [
            `Create an exquisite, high-fashion sketch or runway concept mood board for a design titled: "${params.conceptName}".`,
            'Style: Haute couture, avant-garde, highly artistic, editorial fashion illustration.',
            'Aspect ratio: vertical portrait (9:16).',
            '',
            `Design Concept: ${params.prompt}`,
            '',
            'Requirements:',
            '- Focus on dramatic silhouettes and fabric texture.',
            '- Use an artistic medium (e.g., watercolor, charcoal, dramatic 3D render, minimalist ink).',
            '- Must look like it comes from a legendary Parisian atelier.',
        ].join('\n');

        console.log('[VisionPipeline] Generating sketch with', VISION_MODEL, '...');

        const response = await genAI.models.generateContent({
            model: VISION_MODEL,
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            config: { responseModalities: ['TEXT', 'IMAGE'] as any },
        });

        const candidate = response.candidates?.[0];
        let imageBase64: string | null = null;
        let caption = '';

        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData?.data) imageBase64 = part.inlineData.data;
                if (part.text) caption = part.text;
            }
        }

        if (!imageBase64) throw new Error('Safety filter / No image returned');

        return { imageBase64, caption: caption || `Sketch generated: ${params.conceptName}` };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[VisionPipeline] Sketch generation failed:', message);
        return { imageBase64: null, caption: `[Error] ${message.substring(0, 200)}`, error: message };
    }
}

function buildGenerationPrompt(params: GenerateOutfitParams): string {
    if (!params.userFrameBase64) {
        // Fallback to standard editorial generation if no camera frame
        const lines = [
            'Generate a high-end, editorial fashion photograph of the following outfit.',
            'Style: Professional runway photography, clean studio background, perfect lighting.',
            'Aspect ratio: vertical portrait (9:16).',
            '',
            `Event / Occasion: ${params.eventContext}`,
            `Outfit: ${params.prompt}`,
        ];
        if (params.styleNotes) lines.push(`Styling Notes: ${params.styleNotes}`);
        return lines.join('\n');
    }

    // Virtual Try-On (VTO) Image-to-Image Prompt
    const lines = [
        'VIRTUAL TRY-ON TASK: Redress the person in the provided image with the new outfit described below.',
        'YOU MUST STRICTLY PRESERVE THE IDENTITY, FACE, HAIR, RACE, AND POSE OF THE PERSON IN THE ORIGINAL IMAGE. DO NOT CHANGE WHO THEY ARE.',
        'Preserve the original background and lighting as much as possible.',
        'Only change the clothing they are wearing.',
        '',
        `Target Event: ${params.eventContext}`,
        `New Outfit to generate onto the subject: ${params.prompt}`,
    ];

    if (params.styleNotes) {
        lines.push(`Styling Notes: ${params.styleNotes}`);
    }

    lines.push(
        '',
        'Requirements:',
        '- Photorealistic image manipulation.',
        '- The new clothes must fit the subject naturally, respecting the physics of drape and gravity on their specific pose.',
        '- Seamless blending with the original image.',
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
