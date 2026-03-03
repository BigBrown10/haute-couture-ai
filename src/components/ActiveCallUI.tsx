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
            <div className={`avatar-ring ${!sessionReady ? 'connecting' : ''} ${isThinking ? 'thinking' : ''}`}>
                <div className="ring-pulse"></div>
                <img src={persona.image} alt={persona.name} className="active-avatar-img" />
            </div>

            <div className="active-call-info glass-panel">
                <h2>{persona.name}</h2>
                <p className="call-status">
                    {!sessionReady ? 'Connecting...' : isThinking ? 'Analyzing your look...' : 'Listening...'}
                </p>
            </div>
        </div>
    );
}
