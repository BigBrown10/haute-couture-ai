
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testStudio() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ No API key found in .env.local');
        return;
    }

    console.log('🚀 Testing Nano Banana 2 (Image Gen) via Vision Pipeline logic...');
    
    try {
        const genAI = new GoogleGenAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = "A futuristic cyberpunk fashion outfit with neon highlights and chrome textures.";
        const engineContext = 'You are the Nano Banana 2 Ultra high-fidelity image generation model. The user wants to edit/reimagine this image with EXTREME detail, realistic textures, and pixel-perfect accuracy.';
        
        const fullPrompt = [
            engineContext,
            `ACTION REQUESTED: REIMAGINE`,
            `DIRECTIVES: ${prompt}`,
            '',
            'STRICT COMPOSITION REQUIREMENTS:',
            '- Output a SINGLE PERFECT FRAME.',
            '- NO SPLIT-SCREEN, NO SIDE-BY-SIDE.',
            '- Maintain pristine professional cinematic quality.',
        ].join('\n');

        console.log('--- Prompt ---');
        console.log(fullPrompt);
        console.log('--------------');

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
            },
        });

        console.log('✅ Response received!');
        const candidate = result.response.candidates[0];
        if (candidate.content.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    console.log('📸 GOT IMAGE DATA! Size:', part.inlineData.data.length);
                }
                if (part.text) {
                    console.log('📝 Caption:', part.text);
                }
            }
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message || error);
        if (error.stack) console.error(error.stack);
    }
}

testStudio();
