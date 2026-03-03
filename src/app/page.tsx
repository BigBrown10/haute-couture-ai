'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
// CameraFeed removed for Sprint 6 Photo Upload Pivot
import GlassControlBar from '@/components/GlassControlBar';
import OutfitGallery from '@/components/OutfitGallery';
import ActiveCallUI from '../components/ActiveCallUI';
import LandingOverlay, { Persona } from '@/components/LandingOverlay';
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
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('Despina');
  const [mode, setMode] = useState<'stylist' | 'designer'>('stylist');
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [garmentPhoto, setGarmentPhoto] = useState<string | null>(null);
  const [userVolume, setUserVolume] = useState(0);
  const [agentVolume, setAgentVolume] = useState<VisemeData>({ volume: 0, a: 0, i: 0, u: 0, e: 0, o: 0 });

  const messageIdRef = useRef(0);
  const sessionActiveRef = useRef(false);

  const addOutfit = useCallback((imageBase64: string | null, caption: string) => {
    const id = `outfit-${Date.now()}-${messageIdRef.current++}`;
    setOutfits((prev) => [...prev, { id, imageBase64, caption, timestamp: Date.now() }]);
    setThinkingStatus(null);
  }, []);

  // ── Audio Playback ─────────────────────────────────────
  const { playChunk, stopPlayback, cleanup: cleanupAudio } = useAudioPlayback(setAgentVolume);

  // ── Socket Connection ──────────────────────────────────
  const {
    connected,
    startSession,
    endSession,
    sendAudioChunk,
    sendVideoFrame,
    sendText,
    requestOutfit,
  } = useSocketConnection({
    onTranscript: (text, role) => {
      // Transcript is hidden in UI, but we could log it or use it for triggers
      console.log(`[Transcript] ${role}: ${text}`);
    },
    onGeneratedOutfit: (imageBase64, caption) => addOutfit(imageBase64, caption),
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

      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        if (result) {
          const base64Data = result.split(',')[1];
          setUserPhoto(base64Data);
          sendVideoFrame(base64Data);
          sendText("Hey bestie! I just uploaded a photo of myself. What do you think of my current fit? Can you show me something better?");
        }
      };
      reader.readAsDataURL(file);
    },
    [sendVideoFrame, sendText]
  );

  const handleGarmentPhoto = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        if (result) {
          const base64Data = result.split(',')[1];
          setGarmentPhoto(base64Data);
          // For now, we send both to the backend as frames. 
          // The backend prompt will instruct the model to handle it.
          sendVideoFrame(base64Data);
          sendText("Wait, what about this specific dress/item? Can you place this on me so I can see how it looks?");
        }
      };
      reader.readAsDataURL(file);
    },
    [sendVideoFrame, sendText]
  );

  // Outfit generation request
  const handleRequestOutfit = useCallback(
    (prompt: string) => {
      requestOutfit(
        prompt,
        mode === 'stylist' ? 'Virtual Try-On' : 'Haute Couture Sketch',
        mode === 'stylist' ? 'Fit strictly to the user\'s body type in the frame' : 'Avant-garde artistic vision'
      );
    },
    [requestOutfit, mode]
  );

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
            <div className="brand">
              <div className="brand-logo">👁</div>
              <span className="brand-name">Haute Couture AI</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
              <span className="session-badge live">
                {sessionReady ? '● LIVE' : '◌ CONNECTING'}
              </span>
            </div>
          </header>

          <div className="main-content" style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            minHeight: 'calc(100vh - 160px)'
          }}>
            {activePersona && (
              <div className="video-call-box">
                <ActiveCallUI
                  persona={activePersona}
                  isThinking={!!thinkingStatus}
                  sessionReady={sessionReady}
                  agentVolume={agentVolume}
                />
              </div>
            )}

            <div className="gallery-section hearts-atelier-panel" style={{
              position: 'absolute',
              right: '2rem',
              top: '6rem',
              width: '400px',
              height: 'calc(100vh - 180px)',
              overflowY: 'auto',
              zIndex: 20,
              background: 'rgba(22, 24, 28, 0.95)',
              borderRadius: '24px',
              border: '1px solid rgba(212, 168, 83, 0.15)',
              padding: '1.5rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)'
            }}>
              <OutfitGallery outfits={outfits} />
            </div>
          </div>

          <GlassControlBar
            micEnabled={micEnabled}
            onToggleMic={handleToggleMic}
            onEndSession={handleEndSession}
            canTryOn={!!userPhoto}
            onUploadPhoto={handleUserPhoto}
            onTryOnItem={handleGarmentPhoto}
          />
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
