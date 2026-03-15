'use client';

import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
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

  // ── Audio Ref for VRM Lipsync ────────────────────────────
  const agentVolumeRef = useRef({ volume: 0, a: 0, i: 0, u: 0, e: 0, o: 0 });

  // ── Audio Hooks ──────────────────────────────────────────
  const { playChunk, stopPlayback, cleanup, initAudio } = useAudioPlayback((visemes) => {
    agentVolumeRef.current = visemes;
  });
  
  const {
    connected,
    connect,
    disconnect,
    sendAudio,
    sendText,
  } = useGeminiLive({
    onTranscript: (text, role) => {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === role && lastMsg.text === text) return prev;
        
        return [...prev, {
          id: `msg-${Date.now()}`,
          text,
          role,
          timestamp: Date.now()
        }];
      });
    },
    onThought: (text) => {
      setMessages(prev => [...prev, {
        id: `msg-thought-${Date.now()}`,
        text: `**inner thoughts** ${text}`,
        role: 'agent',
        timestamp: Date.now(),
        thought: text
      }]);
    },
    onThinking: (status) => setThinkingStatus(status || null),
    onError: (msg) => console.error(`[Agent Error] ${msg}`),
    onAudioOut: (audioBase64) => {
      playChunk(audioBase64);
    },
    onAgentGesture: (animation) => {
      setAgentGesture(animation);
      setTimeout(() => setAgentGesture(null), 100);
    }
  });

  const { startCapture, stopCapture } = useAudioCapture((base64) => {
    if (micEnabled && connected) sendAudio(base64);
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

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    const systemInstruction = SYSTEM_PROMPTS[agentId] || PERSONA_SYSTEM_PROMPT;

    connect(apiKey, { systemInstruction }).then(() => {
      setSessionReady(true);
    });

    initAudio();
    startCapture();
    setMicEnabled(true);

    return () => {
      disconnect();
      stopCapture();
      stopPlayback();
      cleanup();
    };
  }, [agentId, router, connect, disconnect, initAudio, stopCapture, stopPlayback, cleanup, startCapture]);

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
        // sendVideoFrame(base64Data); // Future work: native video support
        
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, text: "Here is my photo.", imageBase64: base64Data } : m
        ));
        setThinkingStatus(null);
        sendText(activePersona?.mode === 'designer' 
          ? "I just uploaded a reference sketch. Could you analyze it?"
          : "Hey bestie! I just uploaded a photo. What do you think?");
      }
    };
    img.src = URL.createObjectURL(file);
  }, [sendText, activePersona]);

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
        // sendGarmentPhoto(base64Data); // Future work: native multimodal support
        
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, text: "Can you try this on me?", imageBase64: base64Data } : m
        ));
        setThinkingStatus(null);
        sendText("Wait, what about this specific item?");
      }
    };
    img.src = URL.createObjectURL(file);
  }, [sendText]);

  const handleSendMessage = useCallback((text: string) => {
    sendText(text);
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      text,
      role: 'user',
      timestamp: Date.now()
    }]);
  }, [sendText]);

  useEffect(() => {
    if (isChatExpanded) {
      stopPlayback();
      cleanup();
      stopCapture();
      setMicEnabled(false);
    } else {
      initAudio();
      setMicEnabled(true);
      startCapture();
    }
  }, [isChatExpanded, stopPlayback, cleanup, stopCapture, initAudio, startCapture]);

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
               onToggle={() => {}}
               isExpanded={isChatExpanded}
               onToggleExpand={() => setIsChatExpanded(!isChatExpanded)}
               personaName={activePersona.name}
               canTryOn={!!userPhoto}
               micEnabled={micEnabled}
               onToggleMic={handleToggleMic}
               onUploadPhoto={handleUserPhoto}
               onTryFit={handleGarmentPhoto}
               onEndSession={handleEndSession}
               onRequestStudioEdit={() => {}}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
