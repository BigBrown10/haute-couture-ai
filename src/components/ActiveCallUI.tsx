'use client';

import { Persona } from './LandingOverlay';
import VRMStage from './VRMStage';
import { VisemeData } from '@/hooks/useAudioPlayback';

interface ActiveCallUIProps {
    persona: {
        name: string;
        image: string;
    };
    isThinking: boolean;
    sessionReady: boolean;
    userVolume?: number;
    agentVolumeRef: React.MutableRefObject<VisemeData>;
    agentGesture?: string | null;
    onEndSession?: () => void;
}

export default function ActiveCallUI({
    persona,
    isThinking,
    sessionReady,
    agentVolumeRef,
    agentGesture = null,
    onEndSession
}: ActiveCallUIProps) {
    return (
        <div className="active-call-ui" style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Back Button Overlay */}
            <button 
                onClick={onEndSession}
                style={{
                position: 'fixed', top: '2rem', left: '2rem', zIndex: 1000,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(30px)', color: '#fff', borderRadius: '12px',
                padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px',
                cursor: 'pointer', fontSize: '1rem', fontWeight: 600, fontFamily: "'Inter', sans-serif",
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}>
                <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>‹</span> Back
            </button>

            {/* 3D VRM Stage replacing 2D puppets. The CSS makes this fullscreen behind the UI. */}
            <div className="vrm-stage-wrapper" style={{
                opacity: 1,
                pointerEvents: 'auto',
                width: '100%', height: '100%'
            }}>
                <VRMStage
                    personaName={persona.name}
                    agentVolumeRef={agentVolumeRef}
                    isThinking={isThinking}
                    agentGesture={agentGesture}
                />
            </div>
        </div>
    );
}
