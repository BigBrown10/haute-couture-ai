'use client';

import { Persona } from './LandingOverlay';

interface ActiveCallUIProps {
    persona: Persona;
    isThinking: boolean;
    sessionReady: boolean;
}

export default function ActiveCallUI({ persona, isThinking, sessionReady }: ActiveCallUIProps) {
    return (
        <div className="active-call-ui">
            <div className={`avatar-container ${!sessionReady ? 'connecting' : ''} ${isThinking ? 'thinking' : 'speaking'}`}>
                {/* Grok-style fluid visualizer background */}
                <div className="vibe-visualizer">
                    <div className="blob blob-1"></div>
                    <div className="blob blob-2"></div>
                    <div className="blob blob-3"></div>
                </div>

                <div className={`avatar-ring`}>
                    <img src={persona.image} alt={persona.name} className="active-avatar-img" />
                </div>
            </div>

            <div className="active-call-info glass-panel">
                <h2 className="bestie-name">{persona.name}</h2>
                <div className="status-indicator">
                    <span className="dot"></span>
                    <p className="call-status">
                        {!sessionReady ? 'Connecting to bestie...' : isThinking ? 'Thinking...' : 'Active Now'}
                    </p>
                </div>
            </div>
        </div>
    );
}
