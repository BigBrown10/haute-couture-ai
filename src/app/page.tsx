'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import CameraFeed from '@/components/CameraFeed';
import GlassControlBar from '@/components/GlassControlBar';
import OutfitGallery from '@/components/OutfitGallery';
import ActiveCallUI from '@/components/ActiveCallUI';
import LandingOverlay, { Persona } from '@/components/LandingOverlay';
import { useSocketConnection } from '@/hooks/useSocketConnection';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';

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
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('Despina');
  const [mode, setMode] = useState<'stylist' | 'designer'>('stylist');
  const [activePersona, setActivePersona] = useState<Persona | null>(null);

  const messageIdRef = useRef(0);
  const sessionActiveRef = useRef(false);

  const addOutfit = useCallback((imageBase64: string | null, caption: string) => {
    const id = `outfit-${Date.now()}-${messageIdRef.current++}`;
    setOutfits((prev) => [...prev, { id, imageBase64, caption, timestamp: Date.now() }]);
    setThinkingStatus(null);
  }, []);

  // ── Audio Playback ─────────────────────────────────────
  const { playChunk, stopPlayback, cleanup: cleanupAudio } = useAudioPlayback();

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
    )
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

  // Video frame callback — 1 FPS to server
  const handleVideoFrame = useCallback(
    (frameBase64: string) => {
      if (sessionActiveRef.current && cameraEnabled) {
        sendVideoFrame(frameBase64);
      }
    },
    [cameraEnabled, sendVideoFrame]
  );

  // Text message send (removed for voice-only)

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
      {/* Layer 1: Camera Feed */}
      <div className="camera-layer">
        <CameraFeed
          enabled={sessionActive && cameraEnabled}
          onFrame={handleVideoFrame}
        />
      </div>

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

          <div className="main-content" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {activePersona && (
              <ActiveCallUI
                persona={activePersona}
                isThinking={!!thinkingStatus}
                sessionReady={sessionReady}
              />
            )}

            <OutfitGallery outfits={outfits} />
          </div>

          <GlassControlBar
            mode={mode}
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
            selectedVoice={selectedVoice}
            onToggleMode={() => {
              // Toggle is now hidden or handled via end session in the Voice-Only UI
            }}
            onToggleMic={handleToggleMic}
            onToggleCamera={() => setCameraEnabled((p) => !p)}
            onChangeVoice={setSelectedVoice}
            onEndSession={handleEndSession}
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
