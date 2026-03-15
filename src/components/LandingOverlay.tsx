import { useState } from 'react';
import RotatingHeroText from './RotatingHeroText';

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
        specialty: 'Chic Parisian Stylist',
        description: 'Effortlessly chic and sharp. She is the sophisticated older sister you always wanted. She will be honest about your fit but only because she wants you to look like a million bucks.',
        image: '/avatars/despina.png',
        voice: 'Kore',
        mode: 'stylist'
    },
    {
        id: 'tony',
        name: 'Tony',
        specialty: 'Streetwear Expert',
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
        specialty: '3D AI Designer',
        description: 'Sophisticated, precise, and visionary. Aria translates your wildest design concepts into pure, high-fidelity sketches and patterns. She is a peer for designers and a mentor for tailors.',
        image: '/avatars/Aria.png',
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
    const [showHero, setShowHero] = useState(true);

    const selectedPersona = PERSONAS.find(p => p.id === selectedId)!;

    return (
        <div className={`landing-overlay grid-background ${exiting ? 'exiting' : ''}`} style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            background: '#000'
        }}>
            {/* Top Navigation Bar */}
            <div className="top-nav-bar" style={{
                padding: '2rem 4rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 100,
                flexShrink: 0
            }}>
                <div className="nav-logo">
                    <img 
                        src="/zaute-logo-v2.png" 
                        alt="ZAUTE" 
                        style={{ height: '32px', objectFit: 'contain' }} 
                    />
                </div>
                <div className="nav-menu" style={{ display: 'flex', gap: '2rem' }}>
                    <button className="nav-link" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', cursor: 'pointer', opacity: 0.6 }}>Home</button>
                    <button className="nav-link" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', cursor: 'pointer', opacity: 0.6 }}>Our Stylists</button>
                    <button className="nav-link" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', cursor: 'pointer', opacity: 0.6 }}>About</button>
                </div>
            </div>

            {showHero ? (
                /* Stage 1: Brutal Hero */
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingBottom: '5rem'
                }}>
                    <RotatingHeroText />

                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2rem' }}>
                        <button 
                            className="btn-brutal"
                            onClick={() => setShowHero(false)}
                        >
                            Start Styling →
                        </button>
                        <button className="btn-brutal-outline">
                            See how it works ○
                        </button>
                    </div>
                </div>
            ) : (
                /* Stage 2: Persona Selection */
                <div className="landing-content-wide" style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <h2 style={{
                        fontFamily: 'var(--font-acid-heading)',
                        fontSize: '3rem',
                        color: 'var(--color-acid-green)',
                        marginBottom: '4rem',
                        textTransform: 'uppercase',
                        fontWeight: 800
                    }}>
                        Select your stylist
                    </h2>
                    <div className="avatars-container" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '2.5rem',
                        width: '100%',
                        maxWidth: '1200px'
                    }}>
                        {PERSONAS.map(persona => (
                            <div
                                key={persona.id}
                                className={`avatar-card`}
                                onClick={() => onStart(persona)}
                                style={{
                                    cursor: 'pointer',
                                    transition: 'all 0.3s var(--ease-out-expo)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.03)',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}
                            >
                                <img 
                                    src={persona.image} 
                                    alt={persona.name} 
                                    style={{ width: '100%', height: '400px', objectFit: 'cover', opacity: 0.8 }} 
                                />

                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    padding: '2rem',
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)'
                                }}>
                                    <h3 style={{
                                        fontSize: '2rem',
                                        fontFamily: 'var(--font-acid-heading)',
                                        color: 'var(--color-acid-green)',
                                        margin: 0,
                                        fontWeight: 900
                                    }}>
                                        {persona.name.toUpperCase()}
                                    </h3>
                                    <p style={{
                                        fontSize: '0.8rem',
                                        color: 'rgba(255,255,255,0.6)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.1em',
                                        marginTop: '0.5rem'
                                    }}>
                                        {persona.specialty}
                                    </p>
                                    
                                    <button 
                                        className="btn-brutal" 
                                        style={{ 
                                            width: '100%', 
                                            marginTop: '1.5rem', 
                                            padding: '10px', 
                                            fontSize: '0.8rem',
                                            background: '#fff',
                                            color: '#000'
                                        }}
                                    >
                                        Initialize Session →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
