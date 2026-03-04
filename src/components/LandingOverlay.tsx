'use client';

import { useState } from 'react';

export type PersonaId = 'despina' | 'gina' | 'tony' | 'aria';

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
        specialty: 'Chic Parisian Big Sister',
        description: 'Effortlessly chic and sharp. She is the sophisticated older sister you always wanted. She will be honest about your fit but only because she wants you to look like a million bucks.',
        image: '/avatars/despina.png',
        voice: 'Kore',
        mode: 'stylist'
    },
    {
        id: 'tony',
        name: 'Tony',
        specialty: 'Sneakerhead Brother',
        description: 'The effortlessly cool brother who knows every drop. He focuses on drip, proportions, and making sure your streetwear game is untouchable.',
        image: '/avatars/tony.png',
        voice: 'Puck',
        mode: 'stylist'
    },
    {
        id: 'gina',
        name: 'Gina',
        specialty: 'Your Glam Bestie',
        description: 'Bubbly, energetic, and your biggest hype woman! She specialize in making sure you look absolutely stunning for any event, from prom to the red carpet.',
        image: '/avatars/gina.png',
        voice: 'Aoede',
        mode: 'stylist'
    },
    {
        id: 'aria',
        name: 'Aria',
        specialty: 'Haute Couture Illustrator',
        description: 'Sophisticated, precise, and visionary. Aria translates your wildest design concepts into pure, high-fidelity sketches and patterns. She is a peer for designers and a mentor for tailors.',
        image: '/avatars/aria.png',
        voice: 'Charon',
        mode: 'designer'
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
            {/* Spline 3D Interactive Background */}
            <div className="spline-bg-wrapper">
                <iframe
                    src='https://my.spline.design/darkmatter-44e1ca1aebaf4293f9de2da2cbde3b1f/'
                    frameBorder='0'
                    width='100%'
                    height='100%'
                    className="spline-iframe"
                    title="Interactive 3D Background"
                />
            </div>

            <div className="landing-content-wide spline-overlay-panel">
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h1 className="landing-title-premium">PROJECT HAUTE COUTURE</h1>
                    <p className="landing-subtitle-premium">
                        Meet your new AI fashion bestie.
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
                    >
                        Start Now!
                    </button>
                </div>
            </div>
        </div>
    );
}
