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
        voice: 'Puck', // Puck is male
        mode: 'stylist'
    },
    {
        id: 'gina',
        name: 'Gina',
        specialty: 'Your Glam Bestie',
        description: 'Bubbly, energetic, and your biggest hype woman! She specialize in making sure you look absolutely stunning for any event, from prom to the red carpet.',
        image: '/avatars/gina.png',
        voice: 'Aoede', // Aoede is female
        mode: 'stylist'
    },
    {
        id: 'aria',
        name: 'Aria',
        specialty: 'Haute Couture Illustrator',
        description: 'Sophisticated, precise, and visionary. Aria translates your wildest design concepts into pure, high-fidelity sketches and patterns. She is a peer for designers and a mentor for tailors.',
        image: '/avatars/aria.png',
        voice: 'Aoede', // Aoede is female instead of Charon (male)
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
            {/* Top Navigation Bar */}
            <div className="top-nav-bar">
                <div className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <img src="/hc-logo.png" alt="HC Logo" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
                    <h1 className="landing-title-premium-small" style={{ textTransform: 'none', letterSpacing: '1px', fontWeight: 400 }}>Haute couture</h1>
                </div>
                <div className="nav-menu">
                    <button className="nav-link">Home</button>
                    <button className="nav-link">Our Stylists</button>
                    <button className="nav-link">About</button>
                    <button className="nav-link">Contact</button>
                </div>
            </div>

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
                {/* The large title was removed from here. The Top Nav Bar now handles it! */}
                <div className="avatars-container">
                    {PERSONAS.map(persona => (
                        <div
                            key={persona.id}
                            className={`avatar-card`}
                            onClick={() => onStart(persona)}
                        >
                            <img src={persona.image} alt={persona.name} className="avatar-image" />

                            <div className="avatar-info">
                                <h3>{persona.name}</h3>
                                <p className="avatar-specialty">{persona.specialty}</p>

                                <div className="avatar-description">
                                    <p>{persona.description}</p>
                                    <span className="launch-prompt">Click to connect →</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
