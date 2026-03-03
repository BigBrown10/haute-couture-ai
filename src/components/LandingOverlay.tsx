'use client';

import { useState } from 'react';

export type PersonaId = 'despina' | 'gina' | 'tony';

export interface Persona {
    id: PersonaId;
    name: string;
    specialty: string;
    description: string;
    image: string;
    voice: string;
    mode: 'stylist' | 'designer';
}

export const PERSONAS: Persona[] = [
    {
        id: 'despina',
        name: 'Despina',
        specialty: 'Haute Couture & Editorial',
        description: 'Avant-garde Parisian stylist. Brutally honest, expects perfection. Will tear your outfit apart and rebuild it.',
        image: '/avatars/despina.png',
        voice: 'Kore',
        mode: 'stylist'
    },
    {
        id: 'tony',
        name: 'Tony',
        specialty: 'Streetwear & Smart Casual',
        description: 'Cool, modern, and effortless. Focuses on premium basics, sneakers, and clean silhouettes.',
        image: '/avatars/tony.png',
        voice: 'Puck',
        mode: 'stylist'
    },
    {
        id: 'gina',
        name: 'Gina',
        specialty: 'Prom & Evening Wear',
        description: 'Glamorous and upbeat! Expert in event dressing, sequins, and making sure you steal the show.',
        image: '/avatars/gina.png',
        voice: 'Aoede',
        mode: 'stylist'
    }
];

interface LandingOverlayProps {
    exiting: boolean;
    onStart: (persona: Persona) => void;
}

export default function LandingOverlay({ exiting, onStart }: LandingOverlayProps) {
    const [selectedId, setSelectedId] = useState<PersonaId>('despina');

    const selectedPersona = PERSONAS.find(p => p.id === selectedId)!;

    return (
        <div className={`landing-overlay ${exiting ? 'exiting' : ''}`}>
            <div className="landing-content-wide">
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <p className="landing-subtitle" style={{ fontSize: '1.2rem', opacity: 0.8 }}>
                        Select your AI stylist. Upload a photo of your fit. Get brutally honest feedback.
                    </p>
                </div>

                <div className="avatars-container">
                    {PERSONAS.map(persona => (
                        <div
                            key={persona.id}
                            className={`avatar-card ${selectedId === persona.id ? 'selected' : ''}`}
                            onClick={() => setSelectedId(persona.id)}
                        >
                            <img src={persona.image} alt={persona.name} className="avatar-image" />
                            <div className="avatar-info">
                                <h3>{persona.name}</h3>
                                <p>{persona.specialty}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="selected-persona-details glass-panel">
                    <h2>Meet {selectedPersona.name}</h2>
                    <p>{selectedPersona.description}</p>
                    <button
                        className="glass-button landing-cta"
                        onClick={() => onStart(selectedPersona)}
                        id="begin-session"
                        style={{ marginTop: '1.5rem', fontSize: '1.2rem', padding: '16px 32px' }}
                    >
                        Start Video Call with {selectedPersona.name}
                    </button>
                </div>
            </div>
        </div>
    );
}
