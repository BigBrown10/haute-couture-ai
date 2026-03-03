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
    agentVolume = 0
}: ActiveCallUIProps) {
    return (
        <div className="active-call-ui">
            {/* 3D VRM Stage replacing 2D puppets. The CSS makes this fullscreen behind the UI. */}
            <div className="vrm-stage-wrapper" style={{
                opacity: sessionReady ? 1 : 0,
                transition: 'opacity 1s ease-in-out',
                pointerEvents: 'auto'
            }}>
                <VRMStage
                    personaName={persona.name}
                    agentVolume={agentVolume}
                    isThinking={isThinking}
                />
            </div>
        </div>
    );
}
