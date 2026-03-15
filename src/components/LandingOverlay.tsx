import { useState, useRef } from 'react';
import RotatingHeroText from './RotatingHeroText';
import SerratedDivider from './SerratedDivider';
import StickyNote from './StickyNote';
import CatalogLabel from './CatalogLabel';
import Marquee from './Marquee';
import FeatureGrid from './FeatureGrid';

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
        description: 'Effortlessly chic and sharp. She is the sophisticated older sister you always wanted.',
        image: '/avatars/despina.png',
        voice: 'Kore',
        mode: 'stylist'
    },
    {
        id: 'tony',
        name: 'Tony',
        specialty: 'Streetwear Expert',
        description: 'The effortlessly cool brother who knows every drop.',
        image: '/avatars/tony.png',
        voice: 'Puck',
        mode: 'stylist'
    },
    {
        id: 'gina',
        name: 'Gina',
        specialty: 'Your Glam Bestie',
        description: 'Bubbly, energetic, and your biggest hype woman!',
        image: '/avatars/gina.png',
        voice: 'Aoede',
        mode: 'stylist'
    },
    {
        id: 'aria',
        name: 'Aria',
        specialty: '3D AI Designer',
        description: 'Sophisticated, precise, and visionary AI Designer.',
        image: '/avatars/Aria.png',
        voice: 'Aoede',
        mode: 'designer'
    }
];

interface LandingOverlayProps {
    exiting: boolean;
    onStart: (persona: Persona) => void;
}

export default function LandingOverlay({ exiting, onStart }: LandingOverlayProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className={`landing-overlay neon-grid-bg ${exiting ? 'exiting' : ''}`} style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'var(--bg-avant-black)',
            color: 'var(--text-stone)',
            overflowY: 'auto',
            scrollBehavior: 'smooth'
        }} ref={scrollContainerRef}>
            
            {/* Top Navigation Bar - Center Pill */}
            <nav style={{
                position: 'fixed',
                top: '20px',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 40px',
                zIndex: 1100,
                pointerEvents: 'none'
            }}>
                <div style={{ pointerEvents: 'auto' }}>
                    <img src="/zaute-logo-v2.png" alt="ZAUTE" style={{ height: '64px', opacity: 1 }} />
                </div>
                
                <div style={{
                    display: 'flex',
                    background: 'rgba(12, 10, 9, 0.4)',
                    backdropFilter: 'blur(32px)',
                    WebkitBackdropFilter: 'blur(32px)',
                    padding: '4px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    pointerEvents: 'auto'
                }}>
                    {[
                        { label: 'Stylist', target: 'designer-selection' },
                        { label: 'Features', target: 'features' },
                        { label: 'Contact', target: 'footer' }
                    ].map(link => (
                        <button 
                            key={link.label} 
                            onClick={() => scrollToSection(link.target)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-stone)',
                                padding: '8px 20px',
                                fontSize: '11px',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                borderRadius: '999px',
                                cursor: 'pointer',
                                opacity: 0.6,
                                transition: 'all 300ms var(--ease-editorial)',
                            }} className="nav-btn-hover">
                            {link.label}
                        </button>
                    ))}
                </div>

                <div style={{ pointerEvents: 'auto' }}>
                    <button style={{
                        background: 'var(--color-acid-lime)',
                        color: 'var(--bg-avant-black)',
                        padding: '10px 24px',
                        borderRadius: '999px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(206, 254, 0, 0.25)'
                    }} onClick={() => scrollToSection('designer-selection')}>
                        Inquire
                    </button>
                </div>

            </nav>

            {/* SECTION 1: HERO */}
            <section id="hero" style={{
                minHeight: '100vh',
                display: 'grid',
                gridTemplateColumns: '45% 55%',
                padding: '80px 40px 60px',
                gap: '80px',
                position: 'relative',
                maxWidth: '1800px',
                margin: '0 auto',
                alignItems: 'center',
                background: '#060606'
            }}>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ marginBottom: '4px' }}>
                        <RotatingHeroText />
                    </div>
                    
                    <p style={{ 
                        fontSize: '1.25rem', 
                        fontFamily: 'var(--font-mono)',
                        opacity: 0.6, 
                        maxWidth: '480px', 
                        lineHeight: 1.5,
                        marginBottom: '16px',
                        letterSpacing: '-0.02em'
                    }}>
                        A research-led design archive exploring the intersection of biological form and industrial precision.
                    </p>

                    <button 
                        onClick={() => scrollToSection('designer-selection')}
                        style={{
                            background: 'var(--color-acid-lime)',
                            color: '#000',
                            border: 'none',
                            padding: '16px 48px',
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            borderRadius: '999px',
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            boxShadow: '0 0 30px rgba(206, 254, 0, 0.2)',
                            transition: 'all 300ms var(--ease-editorial)',
                            maxWidth: '240px'
                        }} className="btn-brutal-hover">
                        START STYLING
                    </button>
                </div>


                <div style={{ position: 'relative', height: '100%', minHeight: '600px', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '32px',
                        overflow: 'hidden',
                        position: 'relative',
                        background: '#060606',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <video 
                            autoPlay 
                            loop 
                            muted 
                            playsInline
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectPosition: 'center',
                                opacity: 1
                            }}
                        >
                            <source src="/maniqouue.webm" type="video/webm" />
                        </video>
                    </div>
                    
                </div>
            </section>
            <Marquee />

            {/* SECTION 2: DESIGNER SELECTION */}
            <section id="designer-selection" style={{
                padding: '120px 40px',
                background: 'transparent',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <h2 style={{
                    fontFamily: 'var(--font-acid-heading)',
                    fontSize: 'clamp(2rem, 5vw, 4rem)',
                    fontWeight: 900,
                    textAlign: 'center',
                    marginBottom: '80px',
                    color: 'var(--text-stone)',
                    lineHeight: 0.9,
                    letterSpacing: '-0.04em',
                    textTransform: 'uppercase'
                }}>
                    CHOOSE YOUR FASHION PILOT
                </h2>

                <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '20px',
                    maxWidth: '1400px',
                    margin: '0 auto',
                    paddingBottom: '40px',
                    width: '100%'
                }}>
                    {PERSONAS.map((persona) => (
                        <div key={persona.id} style={{
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'transform 400ms var(--ease-editorial)'
                        }} className="card-hover-scale" onClick={() => onStart(persona)}>
                            <div style={{
                                width: '100%',
                                aspectRatio: '3/4',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                background: '#060606',
                                position: 'relative',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                            }} className="stylist-card-highlight">
                                <img 
                                    src={persona.image} 
                                    alt={persona.name} 
                                    style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'cover', 
                                        transition: 'all 500ms var(--ease-editorial)',
                                        filter: 'grayscale(0)'
                                    }} 
                                    className="card-image"
                                />
                                <CatalogLabel title={persona.name} subtitle={persona.specialty} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <FeatureGrid />

            {/* SECTION 3: FINAL CTA */}
            <section id="footer-cta" className="neon-grid-bg" style={{
                padding: '160px 40px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'transparent'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '800px',
                    background: 'var(--color-acid-lime)',
                    padding: '80px 40px',
                    borderRadius: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{ position: 'absolute', top: '40px', left: '40px', fontSize: '24px' }}>☆</div>
                    <h2 style={{
                        fontFamily: 'var(--font-acid-heading)',
                        fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                        fontWeight: 900,
                        color: '#000',
                        lineHeight: 0.85,
                        margin: 0,
                        letterSpacing: '-0.04em',
                        textTransform: 'uppercase'
                    }}>
                        STOP GUESSING YOUR FIT
                    </h2>
                    
                    <p style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '14px',
                        color: 'rgba(0,0,0,0.6)',
                        maxWidth: '400px',
                        margin: 0,
                        lineHeight: 1.4,
                        fontWeight: 600
                    }}>
                        Get professional unfiltered fashion direction with our 3D AI Agents
                    </p>

                    <button 
                        onClick={() => scrollToSection('hero')}
                        style={{
                            background: '#000',
                            color: 'var(--color-acid-lime)',
                            padding: '18px 48px',
                            borderRadius: '999px',
                            border: 'none',
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 900,
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            transition: 'all 300ms var(--ease-editorial)'
                        }} className="cta-btn-hover">
                        GET STARTED
                    </button>
                </div>
            </section>
            
            <style jsx>{`
                .landing-overlay.exiting {
                    transform: translateY(-20px);
                }
                .grayscale-to-color {
                    filter: grayscale(0.2);
                    transition: all 500ms var(--ease-editorial);
                }
                .card-hover-scale:hover .grayscale-to-color {
                    filter: grayscale(0) !important;
                    transform: scale(1.05);
                }
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .cta-btn-hover:hover {
                    background: var(--text-stone) !important;
                    color: var(--bg-avant-black) !important;
                }
                .stylist-card-highlight {
                    transition: all 400ms var(--ease-editorial);
                }
                .card-hover-scale:hover .stylist-card-highlight {
                    border: 1px solid var(--color-acid-lime) !important;
                    box-shadow: 0 0 15px rgba(206, 254, 0, 0.15);
                }
                .btn-brutal-hover:hover {
                    background: #fff !important;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}
