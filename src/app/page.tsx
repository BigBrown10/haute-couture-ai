'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
// CameraFeed removed for Sprint 6 Photo Upload Pivot
import GlassControlBar from '@/components/GlassControlBar';
import OutfitGallery from '@/components/OutfitGallery';
import ActiveCallUI from '../components/ActiveCallUI';
import LandingOverlay, { Persona } from '@/components/LandingOverlay';
import SplashScreen from '@/components/SplashScreen';
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
  const [splashExited, setSplashExited] = useState(false);
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
  const { playChunk, stopPlayback, cleanup: cleanupAudio, initAudio } = useAudioPlayback(setAgentVolume);

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

  if (!splashExited) {
    return <SplashScreen onEnter={() => setSplashExited(true)} />;
  }

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
              <span className="brand-name" style={{ fontFamily: 'Supercharge, var(--font-serif)', fontSize: '1.4rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
                HAUTE COUTURE
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
              right: 0,
              top: 0,
              width: '400px',
              height: '100vh',
              overflowY: 'auto',
              zIndex: 20,
              display: outfits.length > 0 ? 'block' : 'none',
              background: 'rgba(28, 30, 34, 0.98)',
              borderRadius: '32px 0 0 32px',
              borderLeft: '1px solid rgba(212, 168, 83, 0.2)',
              padding: '4rem 1.5rem 2rem 1.5rem', /* Push content down safely from viewport top */
              boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
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
            hideTryOn={activePersona?.id === 'aria'}
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
