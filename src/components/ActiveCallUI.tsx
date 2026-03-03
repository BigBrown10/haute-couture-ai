'use client';

import { Persona } from './LandingOverlay';
import VRMStage from './VRMStage';

interface ActiveCallUIProps {
    persona: {
        name: string;
        image: string;
    };
    isThinking: boolean;
    sessionReady: boolean;
    userVolume?: number;
    agentVolume?: number;
}

export default function ActiveCallUI({
    persona,
    isThinking,
    sessionReady,
    userVolume = 0,
    agentVolume = 0
}: ActiveCallUIProps) {
    // Combine volumes for a "vibe" scale
    const vibeScale = 1 + (agentVolume * 0.4) + (userVolume * 0.1);
    const agentIntensity = Math.min(1, agentVolume * 2);

    // Pseudo-3D motion variables
    const avatarScale = 1 + (agentVolume * 0.08); // Subtle "leaning in" 
    const avatarY = agentVolume * -12; // Slight upward pop when talking

    // Hyper-Real Puppeteering logic
    const rotationX = agentVolume * -15; // Lean forward
    const rotationY = Math.sin(Date.now() / 1500) * (5 + agentVolume * 10); // Natural swaying
    const tiltTransform = `perspective(1000px) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;

    return (
        <div className="active-call-ui" style={{
            '--vibe-scale': vibeScale,
            '--agent-intensity': agentIntensity,
            '--avatar-scale': avatarScale,
            '--avatar-y': `${avatarY}px`,
            '--tilt-transform': tiltTransform,
            '--agent-volume': agentVolume
        } as React.CSSProperties}>
            <div className={`avatar-container ${!sessionReady ? 'connecting' : ''} ${isThinking ? 'thinking' : agentVolume > 0.05 ? 'speaking' : ''}`}>
                {/* Grok-style fluid visualizer background */}
                <div className="vibe-visualizer">
                    <div className="blob blob-1"></div>
                    <div className="blob blob-2"></div>
                    <div className="blob blob-3"></div>
                </div>

                <div className="avatar-ring">
                    {/* NEW: 3D VRM Stage replacing 2D puppets */}
                    <div className="vrm-stage-wrapper" style={{
                        opacity: sessionReady ? 1 : 0,
                        transition: 'opacity 1s ease-in-out',
                        width: '100%',
                        height: '100%'
                    }}>
                        <VRMStage
                            personaName={persona.name}
                            agentVolume={agentVolume}
                            isThinking={isThinking}
                        />
                    </div>

                    {/* Fallback Puppet Layer (Torso/BG) while loading */}
                    {!sessionReady && (
                        <img src={persona.image} alt="" className="puppet-layer-base" style={{ opacity: 0.5 }} />
                    )}
                </div>
            </div>

            <div className="active-call-info glass-panel">
                <h2 className="bestie-name">{persona.name}</h2>
                <div className="status-indicator">
                    <span className="dot" style={{
                        background: userVolume > 0.1 ? '#00ff88' : '#666',
                        boxShadow: userVolume > 0.1 ? '0 0 15px #00ff88' : 'none',
                        transform: `scale(${1 + userVolume})`
                    }}></span>
                    <p className="call-status">
                        {!sessionReady ? 'Connecting to bestie...' : isThinking ? 'Thinking...' : agentVolume > 0.05 ? 'Talking...' : 'Listening...'}
                    </p>
                </div>
            </div>
        </div>
    );
}
