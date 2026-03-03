'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface UseSocketConnectionProps {
    onTranscript: (text: string, role: 'agent' | 'user') => void;
    onGeneratedOutfit: (imageBase64: string | null, caption: string) => void;
    onThinking: (status: string) => void;
    onSessionStarted: (mode: 'live') => void;
    onError: (message: string) => void;
    onInterrupted: () => void;
    onAudioOut: (audioBase64: string) => void;
}

export function useSocketConnection(props: UseSocketConnectionProps) {
    const socketRef = useRef<Socket | null>(null);
    const callbacksRef = useRef(props);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        callbacksRef.current = props;
    }, [props]);

    // Initialize socket — connects to the separate backend server
    useEffect(() => {
        const socket = io(BACKEND_URL, {
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected to backend at', BACKEND_URL);
            setConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
            setConnected(false);
        });

        socket.on('session-started', (data: { mode: 'live' }) => {
            callbacksRef.current.onSessionStarted(data.mode);
        });

        socket.on('transcript', (data: { text: string; role: 'agent' | 'user' }) => {
            callbacksRef.current.onTranscript(data.text, data.role);
        });

        socket.on('generated-outfit', (data: { imageBase64: string | null; caption: string }) => {
            callbacksRef.current.onGeneratedOutfit(data.imageBase64, data.caption);
        });

        socket.on('agent-thinking', (data: { status: string }) => {
            callbacksRef.current.onThinking(data.status);
        });

        socket.on('audio-out', (audioBase64: string) => {
            callbacksRef.current.onAudioOut(audioBase64);
        });

        socket.on('interrupted', () => {
            callbacksRef.current.onInterrupted();
        });

        socket.on('error-msg', (data: { message: string }) => {
            callbacksRef.current.onError(data.message);
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    const startSession = useCallback((voice?: string, mode?: 'stylist' | 'designer') => {
        const socket = socketRef.current;
        if (!socket) return;

        if (!socket.connected) {
            socket.connect();
        }

        const emitStart = () => {
            socket.emit('start-session', { voice, mode });
        };

        if (socket.connected) {
            emitStart();
        } else {
            socket.once('connect', emitStart);
        }
    }, []);

    const endSession = useCallback(() => {
        const socket = socketRef.current;
        if (socket) {
            socket.emit('end-session');
            socket.disconnect();
        }
        setConnected(false);
    }, []);

    const sendAudioChunk = useCallback((audioBase64: string) => {
        socketRef.current?.emit('audio-in', audioBase64);
    }, []);

    const sendVideoFrame = useCallback((frameBase64: string) => {
        socketRef.current?.emit('video-frame', frameBase64);
    }, []);

    const sendText = useCallback((text: string) => {
        socketRef.current?.emit('text-in', text);
    }, []);

    const requestOutfit = useCallback((prompt: string, eventContext: string, styleNotes?: string) => {
        socketRef.current?.emit('generate-outfit', { prompt, eventContext, styleNotes });
    }, []);

    return {
        connected,
        startSession,
        endSession,
        sendAudioChunk,
        sendVideoFrame,
        sendText,
        requestOutfit,
    };
}
