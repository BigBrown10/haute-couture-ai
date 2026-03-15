'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
// CameraFeed removed for Sprint 6 Photo Upload Pivot
import ActiveCallUI from '../components/ActiveCallUI';
import LandingOverlay, { Persona } from '@/components/LandingOverlay';
import ChatPanel from '@/components/ChatPanel';
import { useSocketConnection } from '@/hooks/useSocketConnection';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useAudioPlayback, VisemeData } from '@/hooks/useAudioPlayback';

// TranscriptMessage removed for voice-only mode

export interface GeneratedOutfit {
  id: string;
  imageBase64: string | null;
  caption: string;
  timestamp: number;
}

export default function HomePage() {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [landingExiting, setLandingExiting] = useState(false);
  const [splashExited, setSplashExited] = useState(true);
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('Despina');
  const [mode, setMode] = useState<'stylist' | 'designer'>('stylist');
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [garmentPhoto, setGarmentPhoto] = useState<string | null>(null);
  const [userVolume, setUserVolume] = useState(0);
  // PERFORMANCE FIX: Use a ref for 60fps viseme data to prevent Parent Component re-renders
  const agentVolumeRef = useRef<VisemeData>({ volume: 0, a: 0, i: 0, u: 0, e: 0, o: 0 });
  const [agentGesture, setAgentGesture] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  const messageIdRef = useRef(0);
  const sessionActiveRef = useRef(false);

  const addOutfit = useCallback((imageBase64: string | null, caption: string) => {
    const id = `outfit-${Date.now()}-${messageIdRef.current++}`;
    setOutfits((prev) => [...prev, { id, imageBase64, caption, timestamp: Date.now() }]);
    setThinkingStatus(null);
  }, []);

  // ── Audio Playback ─────────────────────────────────────
  const { playChunk, stopPlayback, cleanup: cleanupAudio, initAudio } = useAudioPlayback(
    useCallback((data: VisemeData) => {
      // Mutate the ref's current object to bridge data to VRMStage without re-rendering page.tsx
      Object.assign(agentVolumeRef.current, data);
    }, [])
  );

  // ── Socket Connection ──────────────────────────────────
  const {
    connected,
    startSession,
    endSession,
    sendAudioChunk,
    sendVideoFrame,
    sendGarmentPhoto,
    sendText,
    requestOutfit,
  } = useSocketConnection({
    onTranscript: (text, role) => {
      console.log(`[Transcript Interface] Received ${role}: "${text}"`);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        text,
        role,
        timestamp: Date.now()
      }]);
    },
    onGeneratedOutfit: (imageBase64, caption) => {
      addOutfit(imageBase64, caption);
      // ADD IMAGE TO CHAT
      setMessages(prev => [...prev, {
        id: `img-${Date.now()}`,
        text: caption,
        role: 'agent',
        imageBase64: imageBase64 || undefined,
        timestamp: Date.now()
      }]);
    },
    onThought: (text) => {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'agent' && !last.imageBase64) {
          return [...prev.slice(0, -1), { ...last, thought: (last.thought || '') + text }];
        }
        return [...prev, { id: `thought-${Date.now()}`, role: 'agent', text: '', thought: text, timestamp: Date.now() }];
      });
    },
    onThinking: (status) => setThinkingStatus(status || null),
    onSessionStarted: () => setSessionReady(true),
    onError: (msg) => console.error(`[Agent Error] ${msg}`),
    onInterrupted: () => {
      // Agent was interrupted by user speech — stop audio playback
      stopPlayback();
    },
    onAudioOut: (audioBase64) => {
      // Play incoming audio from the Live API
      playChunk(audioBase64);
    },
    onAgentGesture: (animation) => {
      // Pass gesture down to the 3D VRMStage
      console.log(`[Page] Received gesture command: ${animation}`);
      setAgentGesture(animation);
      // Automatically reset gesture flag after a tiny delay so the stage catches the rising edge
      setTimeout(() => setAgentGesture(null), 100);
    }
  });

  // ── Audio Capture ──────────────────────────────────────
  const { startCapture, stopCapture, isCapturing } = useAudioCapture(
    useCallback(
      (base64: string) => {
        if (sessionActiveRef.current && micEnabled) {
          sendAudioChunk(base64);
        }
      },
      [sendAudioChunk, micEnabled]
    ),
    setUserVolume
  );

  // ── Session Lifecycle ──────────────────────────────────
  const handleStartSession = useCallback((persona: Persona) => {
    // Eagerly initialize AudioContext strictly during the click handler for iOS Safari support
    initAudio();

    setActivePersona(persona);
    setSelectedVoice(persona.voice);
    setMode(persona.mode);
    setLandingExiting(true);

    setTimeout(async () => {
      setSessionActive(true);
      sessionActiveRef.current = true;
      startSession(persona.voice, persona.mode);

      // Start mic capture
      try {
        await startCapture();
      } catch (err) {
        console.warn('[Page] Mic capture failed', err);
      }
    }, 600);
  }, [startSession, startCapture]);

  const handleEndSession = useCallback(() => {
    sessionActiveRef.current = false;
    endSession();
    stopCapture();
    stopPlayback();
    cleanupAudio();
    setSessionActive(false);
    setSessionReady(false);
    setOutfits([]);
    setThinkingStatus(null);
    setLandingExiting(false);
    setActivePersona(null);
  }, [endSession, stopCapture, stopPlayback, cleanupAudio]);

  // Toggle mic
  const handleToggleMic = useCallback(() => {
    setMicEnabled((prev) => {
      if (prev) {
        stopCapture();
      } else {
        startCapture();
      }
      return !prev;
    });
  }, [startCapture, stopCapture]);

  // ── Photo Upload ───────────────────────────────────────
  const handleUserPhoto = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

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
          sendVideoFrame(base64Data);
          const prompt = activePersona?.mode === 'designer'
            ? "I just uploaded a reference sketch. Could you analyze it and help me iterate on this design?"
            : "Hey bestie! I just uploaded a photo of myself. What do you think of my current style? Can you recommend something better?";
          sendText(prompt);
        }
      };
      img.src = URL.createObjectURL(file);
    },
    [sendVideoFrame, sendText, activePersona]
  );

  const handleGarmentPhoto = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

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
          setGarmentPhoto(base64Data);
          sendGarmentPhoto(base64Data);
          sendText("Wait, what about this specific item? Can you place this on me so I can see how it looks?");
        }
      };
      img.src = URL.createObjectURL(file);
    },
    [sendGarmentPhoto, sendText]
  );

  const handleSendMessage = useCallback((text: string) => {
    console.log(`[Chat Event] User sending message: "${text}"`);
    sendText(text);
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      text,
      role: 'user',
      timestamp: Date.now()
    }]);
  }, [sendText]);

  // ── Text Only Mode Audio Management ──────────────
  useEffect(() => {
    if (isChatExpanded) {
      // Text Only Mode: Stop and cleanup audio
      stopPlayback();
      cleanupAudio();
      stopCapture();
      setMicEnabled(false);
    } else if (sessionActive) {
      // Return to Voice Mode: Re-init and start capture
      initAudio();
      setMicEnabled(true);
      startCapture();
    }
  }, [isChatExpanded, sessionActive, stopPlayback, cleanupAudio, stopCapture, initAudio, startCapture]);

  // SplashScreen logic removed for Zaute Rebrand

  return (
    <main className="app-container">

      {/* Background Dimmer */}
      {sessionActive && <div className="camera-overlay" />}

      {/* Scanning lines when agent is analyzing */}
      {thinkingStatus && sessionActive && (
        <div className="scan-overlay">
          <div className="scan-line" />
          <div className="scan-line" />
        </div>
      )}

      {/* Layer 2: UI Chrome */}
      {sessionActive && (
        <div className="ui-layer">
          <header className="top-bar">
            <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <img 
                src="/zaute-logo-v2.png" 
                alt="ZAUTE" 
                style={{ height: '28px', objectFit: 'contain' }} 
              />
            </div>
          </header>

          <div className="main-content" style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            height: 'calc(100vh - 80px)', // adjust for top-bar
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Left: 3D Scene (Full Width) - HIDDEN in Text Only Mode */}
            <div style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              display: isChatExpanded ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {activePersona && (
                <div className="video-call-box" style={{ width: '100%', height: '100%' }}>
                  <ActiveCallUI
                    persona={activePersona}
                    isThinking={!!thinkingStatus}
                    sessionReady={sessionReady}
                    agentVolumeRef={agentVolumeRef}
                    agentGesture={agentGesture}
                    onEndSession={handleEndSession}
                  />
                </div>
              )}
            </div>

            {/* Right: Chat Panel (Overlay) */}
            <div style={{
              width: isChatExpanded ? '100%' : '440px',
              height: '100%',
              transition: 'all 0.4s var(--ease-out-expo)',
              zIndex: 30,
              position: 'absolute',
              right: 0,
              top: 0
            }}>
              <ChatPanel
                 messages={messages}
                 onSendMessage={handleSendMessage}
                 isOpen={isChatOpen}
                 onToggle={() => setIsChatOpen(!isChatOpen)}
                 isExpanded={isChatExpanded}
                 onToggleExpand={() => setIsChatExpanded(!isChatExpanded)}
                 personaName={activePersona?.name}
                 canTryOn={!!userPhoto}
                 micEnabled={micEnabled}
                 onToggleMic={handleToggleMic}
                 onUploadPhoto={handleUserPhoto}
                 onTryFit={handleGarmentPhoto}
                 onEndSession={handleEndSession}
                 onRequestStudioEdit={() => {}} // Placeholder if needed
              />
            </div>

          </div>
        </div>
      )}

      {!sessionActive && (
        <LandingOverlay
          exiting={landingExiting}
          onStart={handleStartSession}
        />
      )}
    </main>
  );
}
