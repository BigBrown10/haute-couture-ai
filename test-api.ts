
import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No API key');
        return;
    }
    const genAI = new GoogleGenAI({ apiKey });
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Hi');
    console.log(result.response.text());
}

test();
