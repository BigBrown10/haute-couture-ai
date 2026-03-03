/**
 * Ephemeral Token API Route
 *
 * Mints short-lived session tokens for client-side
 * Gemini Live API authentication. In production, this
 * would be a Cloud Run service with proper auth.
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
    // In production: mint an ephemeral Gemini API token via service account
    // For local dev: return a session ID that the WebSocket server validates
    const token = {
        sessionId: uuidv4(),
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
        capabilities: ['audio', 'video', 'vision-generation'],
    };

    return NextResponse.json(token);
}

export async function GET() {
    return NextResponse.json({ status: 'ready' });
}
