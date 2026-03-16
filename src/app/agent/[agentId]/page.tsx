'use client';

import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { useGeminiOrchestrator } from '@/hooks/useGeminiLiveSDK';
import ChatPanel, { ChatMessage } from '@/components/ChatPanel';
import ActiveCallUI from '@/components/ActiveCallUI';
import { PERSONAS, Persona } from '@/lib/agents';
import { useRouter } from 'next/navigation';
import {
  PERSONA_SYSTEM_PROMPT,
  TONY_SYSTEM_PROMPT,
  GINA_SYSTEM_PROMPT,
  ARIA_SYSTEM_PROMPT
} from '@/lib/prompts';

const SYSTEM_PROMPTS: Record<string, string> = {
  despina: PERSONA_SYSTEM_PROMPT,
  tony: TONY_SYSTEM_PROMPT,
  gina: GINA_SYSTEM_PROMPT,
  aria: ARIA_SYSTEM_PROMPT,
};

export default function AgentPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params);
  const router = useRouter();

  // ── Session State ─────────────────────────────────────────
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [activePersona, setActivePersona] = useState<Persona | null>(null);

  // ── UI State ──────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null);
  const [agentGesture, setAgentGesture] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  // 🔥 STALE CLOSURE FIX: This ensures the audio hook always knows if the mic is unmuted
  const micEnabledRef = useRef(micEnabled);
  useEffect(() => {
    micEnabledRef.current = micEnabled;
  }, [micEnabled]);

  // ── Audio Ref for VRM Lipsync ────────────────────────────
  const agentVolumeRef = useRef({ volume: 0, a: 0, i: 0, u: 0, e: 0, o: 0 });

  // ── Audio Hooks ──────────────────────────────────────────
  const { playChunk, stopPlayback, cleanup, initAudio } = useAudioPlayback((visemes) => {
    agentVolumeRef.current = visemes;
  });

  // ── SDK Implementation ───────────────────────────────────
  const {
    connected,
    startAgent,
    disconnect,
    sendFitForCritique,
    sendGarmentPhoto, // EXTRACTED PROPERLY
    sendText,
    sendAudio,
  } = useGeminiOrchestrator({
    onTranscript: (text, role) => {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === role && !lastMsg.imageBase64) {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, text: lastMsg.text + text }
          ];
        }
        return [...prev, {
          id: `msg-${Date.now()}`,
          text,
          role: role as any,
          timestamp: Date.now()
        }];
      });
    },
    onAudioChunk: (base64: string) => {
      const binary = window.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      if (bytes.length > 0) {
        playChunk(new Int16Array(bytes.buffer));
      }
    },
    onImageReady: (url) => {
      console.log('[UI] Nano Banana 2 Image Received:', url);
      setMessages(prev => [...prev, {
        id: `img-${Date.now()}`,
        text: "I've generated a fashion sketch for you.",
        role: 'agent',
        timestamp: Date.now(),
        imageBase64: url
      }]);
    },
    onThinking: (status) => setThinkingStatus(status || null), // WIRED UP
    onError: (msg) => console.error(`[Agent SDK Error] ${msg}`)
  });

  const { startCapture, stopCapture } = useAudioCapture((base64) => {
    // 🔥 Drop the 'connected' check so React doesn't bottleneck the mic!
    if (micEnabledRef.current) sendAudio(base64);
  });

  // ── Initialize Session on Mount ──────────────────────────
  useEffect(() => {
    const persona = PERSONAS.find(p => p.id === agentId);
    if (!persona) {
      router.push('/');
      return;
    }

    setActivePersona(persona);
    setSessionActive(true);

    return () => {
      disconnect();
      stopCapture();
      stopPlayback();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, router]);

  const handleStartSession = async () => {
    console.log('[UI] 🔓 Unlocking Audio & Connecting Agent SDK...');
    try {
      await initAudio();
      await startAgent(agentId as any);

      setSessionReady(true);
      startCapture();
      setMicEnabled(true);
    } catch (err) {
      console.error('[UI] Session Start Failed:', err);
    }
  };

  const handleEndSession = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleToggleMic = useCallback(() => {
    setMicEnabled(prev => !prev);
  }, []);

  const handleUserPhoto = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const tempId = `upload-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      text: "Uploading photo...",
      role: 'user',
      timestamp: Date.now()
    }]);
    setThinkingStatus("Processing photo...");

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_W = 1024, MAX_H = 1024;
      let w = img.width, h = img.height;
      if (w > MAX_W || h > MAX_H) {
        const ratio = Math.min(MAX_W / w, MAX_H / h);
        w *= ratio; h *= ratio;
      }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64Data = dataUrl.split(',')[1];
        setUserPhoto(base64Data);

        sendFitForCritique(base64Data);

        setMessages(prev => prev.map(m =>
          m.id === tempId ? { ...m, text: "Here is my photo. What do you think?", imageBase64: base64Data } : m
        ));
        setThinkingStatus(null);
      }
    };
    img.src = URL.createObjectURL(file);
  }, [sendFitForCritique]);

  const handleGarmentPhoto = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const tempId = `upload-garment-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      text: "Uploading dress...",
      role: 'user',
      timestamp: Date.now()
    }]);
    setThinkingStatus("Analyzing item...");

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_W = 1024, MAX_H = 1024;
      let w = img.width, h = img.height;
      if (w > MAX_W || h > MAX_H) {
        const ratio = Math.min(MAX_W / w, MAX_H / h);
        w *= ratio; h *= ratio;
      }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64Data = dataUrl.split(',')[1];

        sendGarmentPhoto(base64Data);

        setMessages(prev => prev.map(m =>
          m.id === tempId ? { ...m, text: "Can you try this on me?", imageBase64: base64Data } : m
        ));
        setThinkingStatus(null);
      }
    };
    img.src = URL.createObjectURL(file);
  }, [sendGarmentPhoto]);

  const handleSendMessage = useCallback((text: string) => {
    sendText(text);
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      text,
      role: 'user',
      timestamp: Date.now()
    }]);
  }, [sendText]);

  // REPLACE YOUR CURRENT useEffect WITH THIS:
  useEffect(() => {
    if (isChatExpanded) {
      // Chat is open: Stop forwarding audio, but DON'T kill the mic stream
      setMicEnabled(false);
      // Optional: Stop current playback so agent goes quiet when you type
      stopPlayback();
    } else if (sessionReady) {
      // Chat is closed: Resume forwarding audio to Gemini
      setMicEnabled(true);
    }
  }, [isChatExpanded, sessionReady, stopPlayback]);
  if (!activePersona) return null;

  return (
    <main className="app-container">
      <div className="camera-overlay" />

      {thinkingStatus && (
        <div className="scan-overlay">
          <div className="scan-line" />
          <div className="scan-line" />
        </div>
      )}

      {!sessionReady && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(40px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '24px', color: '#fff', textAlign: 'center'
        }}>
          <img src="/zaute-logo-v2.png" alt="ZAUTE" style={{ height: '60px', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            READY TO MEET {activePersona?.name.toUpperCase()}?
          </h2>
          <p style={{ opacity: 0.5, fontSize: '0.9rem', maxWidth: '300px' }}>
            Press the button below to initialize the high-fidelity 3D session.
          </p>
          <button
            onClick={handleStartSession}
            style={{
              background: '#cefe00', color: '#000', border: 'none',
              padding: '16px 48px', borderRadius: '14px', fontSize: '1rem',
              fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s',
              boxShadow: '0 8px 32px rgba(206, 254, 0, 0.3)'
            }}>
            START EXPERIENCE
          </button>
        </div>
      )}

      <div className="ui-layer">
        <header className="top-bar">
          <div className="brand" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
            <img src="/zaute-logo-v2.png" alt="ZAUTE" style={{ height: '42px' }} />
          </div>
        </header>

        <div className="main-content" style={{ display: 'flex', width: '100%', height: 'calc(100vh - 80px)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, display: isChatExpanded ? 'none' : 'flex' }}>
            <ActiveCallUI
              persona={activePersona}
              isThinking={!!thinkingStatus}
              sessionReady={sessionReady}
              agentVolumeRef={agentVolumeRef}
              agentGesture={agentGesture}
              onEndSession={handleEndSession}
            />
          </div>

          <div style={{ width: isChatExpanded ? '100%' : '440px', height: '100%', transition: 'all 0.4s var(--ease-out-expo)', zIndex: 30, position: 'absolute', right: 0, top: 0 }}>
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isOpen={true}
              onToggle={() => { }}
              isExpanded={isChatExpanded}
              onToggleExpand={() => setIsChatExpanded(!isChatExpanded)}
              personaName={activePersona.name}
              canTryOn={!!userPhoto}
              micEnabled={micEnabled}
              onToggleMic={handleToggleMic}
              onUploadPhoto={handleUserPhoto}
              onTryFit={handleGarmentPhoto}
              onEndSession={handleEndSession}
              onRequestStudioEdit={() => { }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}