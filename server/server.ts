/**
 * Standalone Socket.IO Backend Server
 *
 * Routes audio/video between the frontend and the
 * Gemini Live API for real-time fashion critique.
 * No demo mode — requires GEMINI_API_KEY.
 * Designed for Google Cloud Run deployment.
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });
dotenvConfig(); // also load .env if present

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { GeminiLiveSession, LiveSessionCallbacks } from './gemini-live';

const port = parseInt(process.env.PORT || '3001', 10);

// Allowed frontend origins
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
].filter(Boolean) as string[];

// ── Validate API Key ──────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
    console.error('\n  ❌ GEMINI_API_KEY is required. Set it in your environment.\n');
    process.exit(1);
}

// ── HTTP Server with Health Check ─────────────────────────
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    // CORS preflight
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            service: 'haute-couture-backend',
            geminiKey: '✅ configured',
            uptime: process.uptime(),
        }));
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

// ── Socket.IO Server ──────────────────────────────────────
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
    maxHttpBufferSize: 10e6,
    pingTimeout: 30000,   // More aggressive
    pingInterval: 10000,  // More aggressive
});

// ── Shared Heartbeat ──
setInterval(() => {
    io.emit('heartbeat', { uptime: process.uptime(), timestamp: Date.now() });
}, 10000);

io.on('connection', (socket) => {
    console.log(`[Server] Client connected: ${socket.id}`);
    let liveSession: GeminiLiveSession | null = null;

    const callbacks: LiveSessionCallbacks = {
        onAudioOut: (audioBase64: string) => {
            socket.emit('audio-out', audioBase64);
        },
        onTranscript: (text: string, role: 'agent' | 'user') => {
            socket.emit('transcript', { text, role, timestamp: Date.now() });
        },
        onThought: (text: string) => {
            socket.emit('agent-thought', { text, timestamp: Date.now() });
        },
        onGeneratedOutfit: (imageBase64: string | null, caption: string) => {
            socket.emit('generated-outfit', { imageBase64, caption, timestamp: Date.now() });
        },
        onThinking: (status: string) => {
            socket.emit('agent-thinking', { status, timestamp: Date.now() });
        },
        onError: (error: string) => {
            socket.emit('error-msg', { message: error, timestamp: Date.now() });
        },
        onInterrupted: () => {
            socket.emit('interrupted');
        },
        onAgentGesture: (animation: string) => {
            socket.emit('agent-gesture', { animation, timestamp: Date.now() });
        },
    };

    // ── Start Session ────────────────────────────────────────
    socket.on('start-session', async (config?: { voice?: string, mode?: 'stylist' | 'designer' }) => {
        const voice = config?.voice || 'Kore';
        const mode = config?.mode || 'stylist';
        console.log(`[Server] Starting LIVE session for ${socket.id}, voice: ${voice}, mode: ${mode}`);

        liveSession = new GeminiLiveSession(callbacks, voice, mode);
        const connected = await liveSession.connect();

        if (connected) {
            console.log(`[Server] ✅ LIVE mode for ${socket.id} (${mode})`);
            socket.emit('session-started', { mode: 'live' });
        } else {
            console.error(`[Server] ❌ Failed to connect to Gemini Live API for ${socket.id}`);
            socket.emit('error-msg', { message: 'Failed to connect to Gemini Live API. Check your API key.' });
        }
    });

    // ── Receive Audio from Client ──────────────────────────
    socket.on('audio-in', (audioBase64: string) => {
        if (liveSession?.connected) {
            liveSession.sendAudio(audioBase64);
        }
    });

    // ── Receive Video Frame from Client ────────────────────
    socket.on('video-frame', (frameBase64: string) => {
        if (liveSession?.connected) {
            liveSession.sendUserFrame(frameBase64); // renamed from sendVideoFrame
        }
    });

    socket.on('garment-photo', (frameBase64: string) => {
        if (liveSession?.connected) {
            liveSession.sendGarmentFrame(frameBase64);
        }
    });

    // ── Receive Text from Client ───────────────────────────
    socket.on('text-in', async (text: string) => {
        if (liveSession?.connected) {
            await liveSession.sendText(text);
        } else {
            socket.emit('error-msg', { message: 'No active session. Please start a session first.' });
        }
    });

    // ── Manual Outfit Generation ───────────────────────────
    socket.on('generate-outfit', async (params: { prompt: string; eventContext: string; styleNotes?: string }) => {
        callbacks.onThinking('✨ Generating outfit recommendation...');
        const { generateOutfitImage } = await import('./vision-pipeline');
        const result = await generateOutfitImage({
            prompt: params.prompt,
            eventContext: params.eventContext,
            styleNotes: params.styleNotes,
        });
        callbacks.onGeneratedOutfit(result.imageBase64, result.caption);
        callbacks.onThinking('');
    });

    // ── Disconnect ─────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log(`[Server] Client disconnected: ${socket.id}`);
        cleanup();
    });

    socket.on('end-session', () => {
        console.log(`[Server] Session ended by client: ${socket.id}`);
        cleanup();
    });

    function cleanup() {
        if (liveSession) {
            liveSession.disconnect();
            liveSession = null;
        }
    }
});

httpServer.listen(port, '0.0.0.0', () => {
    console.log('');
    console.log('  ✨ Haute Couture AI Backend');
    console.log(`  → http://0.0.0.0:${port}`);
    console.log(`  → Health: http://0.0.0.0:${port}/health`);
    console.log(`  → API Key: ✅ Configured`);
    console.log(`  → CORS: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log('');
});
