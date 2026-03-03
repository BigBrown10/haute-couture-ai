'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import CameraFeed from '@/components/CameraFeed';
import GlassControlBar from '@/components/GlassControlBar';
import TranscriptPanel from '@/components/TranscriptPanel';
import OutfitGallery from '@/components/OutfitGallery';
import AgentThinking from '@/components/AgentThinking';
import LandingOverlay from '@/components/LandingOverlay';
import TextInput from '@/components/TextInput';
import { useSocketConnection } from '@/hooks/useSocketConnection';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';

export interface TranscriptMessage {
  id: string;
  text: string;
  role: 'agent' | 'user';
  timestamp: number;
}

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
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('Despina');

  const messageIdRef = useRef(0);
  const sessionActiveRef = useRef(false);

  const addTranscript = useCallback((text: string, role: 'agent' | 'user') => {
    if (!text.trim()) return;
    const id = `msg-${Date.now()}-${messageIdRef.current++}`;
    setTranscript((prev) => [...prev, { id, text, role, timestamp: Date.now() }]);
  }, []);

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
    onTranscript: (text, role) => addTranscript(text, role),
    onGeneratedOutfit: (imageBase64, caption) => addOutfit(imageBase64, caption),
    onThinking: (status) => setThinkingStatus(status || null),
    onSessionStarted: () => setSessionReady(true),
    onError: (msg) => addTranscript(`⚠ ${msg}`, 'agent'),
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
  const handleStartSession = useCallback(() => {
    setLandingExiting(true);
    setTimeout(async () => {
      setSessionActive(true);
      sessionActiveRef.current = true;
      startSession(selectedVoice);

      // Start mic capture
      try {
        await startCapture();
      } catch (err) {
        console.warn('[Page] Mic capture failed, text-only mode:', err);
      }
    }, 600);
  }, [startSession, selectedVoice, startCapture]);

  const handleEndSession = useCallback(() => {
    sessionActiveRef.current = false;
    endSession();
    stopCapture();
    stopPlayback();
    cleanupAudio();
    setSessionActive(false);
    setSessionReady(false);
    setTranscript([]);
    setOutfits([]);
    setThinkingStatus(null);
    setLandingExiting(false);
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

  // Text message send
  const handleSendText = useCallback(
    (text: string) => {
      addTranscript(text, 'user');
      sendText(text);
    },
    [sendText, addTranscript]
  );

  // Outfit generation request
  const handleRequestOutfit = useCallback(
    (prompt: string) => {
      requestOutfit(prompt, 'styling session', 'Based on the current critique');
    },
    [requestOutfit]
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

          <div className="main-content">
            <TranscriptPanel messages={transcript} />

            <div className="center-space">
              {thinkingStatus && <AgentThinking status={thinkingStatus} />}
            </div>

            <OutfitGallery outfits={outfits} />
          </div>

          {/* Text input for typed messages */}
          <TextInput
            onSendText={handleSendText}
            onRequestOutfit={handleRequestOutfit}
          />

          <GlassControlBar
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
            selectedVoice={selectedVoice}
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
