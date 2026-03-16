import { NextResponse } from 'next/server';
import { GoogleGenAI, type Part } from '@google/genai';
import { MANNEQUIN_BASE_64 } from '@/lib/MannequinBase';

const VISION_MODEL = 'gemini-3.1-flash-image-preview';

export async function POST(req: Request) {
  try {
    const { prompt, userFrameBase64 } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      console.error('[Nano Banana API] Missing Key');
      return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
    }

    const genAI = new GoogleGenAI({ apiKey });
    
    // BUILD PROMPT (Sync with Vision Pipeline)
    const fullPrompt = [
      'VIRTUAL TRY-ON TASK: Redress the subject from the FIRST provided image.',
      !userFrameBase64 
        ? 'FOUNDATION: The first image is a professional sculptural mannequin. Maintain its exact silhouette and posture.'
        : 'FOUNDATION: The first image is the USER. Preserve their identity, face, pose, and background EXACTLY.',
      '',
      `Target Event: Fashion Showcase`,
      `Outfit Description: ${prompt}`,
      '',
      'STRICT COMPOSITION REQUIREMENTS:',
      '- SINGLE FRAME PORTRAIT ONLY.',
      '- NO SPLIT-SCREEN, NO COMPARISON SHOTS.',
      '- High-end, editorial fashion photography style.',
      '- ZERO BACKGROUND CLUTTER.'
    ].join('\n');

    // Build parts array
    const parts: Part[] = [{ text: fullPrompt }];

    // Include user foundation frame or FALLBACK to mannequin
    if (userFrameBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: userFrameBase64,
        },
      });
    } else {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: MANNEQUIN_BASE_64,
        },
      });
    }

    const response = await genAI.models.generateContent({
      model: VISION_MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        responseModalities: ['TEXT', 'IMAGE'] as any,
      },
    });

    // Extract image from response
    const candidate = response.candidates?.[0];
    let imageBase64: string | null = null;

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          imageBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (!imageBase64) {
      throw new Error('Google returned no image. Safety filter may have blocked it.');
    }

    return NextResponse.json({ url: imageBase64 });

  } catch (error: any) {
    console.error(`[Nano Banana API] ❌ CRASH: ${error.message || error}`);
    
    // EMERGENCY FALLBACK
    const fallbackBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    return NextResponse.json({ url: fallbackBase64 });
  }
}