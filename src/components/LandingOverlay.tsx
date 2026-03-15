import { useState, useRef } from 'react';
import RotatingHeroText from './RotatingHeroText';
import SerratedDivider from './SerratedDivider';
import StickyNote from './StickyNote';
import CatalogLabel from './CatalogLabel';

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
        <div className={`landing-overlay ${exiting ? 'exiting' : ''}`} style={{
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
                top: '24px',
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
                    <img src="/zaute-logo-v2.png" alt="ZAUTE" style={{ height: '24px' }} />
                </div>
                
                <div style={{
                    display: 'flex',
                    background: 'rgba(231, 229, 228, 0.05)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    padding: '6px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    pointerEvents: 'auto'
                }}>
                    {['Journal', 'Curations', 'Studio', 'Archive'].map(link => (
                        <button key={link} style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-stone)',
                            padding: '10px 24px',
                            fontSize: '14px',
                            fontWeight: 500,
                            borderRadius: '999px',
                            cursor: 'pointer',
                            transition: 'all 300ms var(--ease-editorial)',
                        }} className="nav-btn-hover">
                            {link}
                        </button>
                    ))}
                </div>

                <div style={{ pointerEvents: 'auto' }}>
                    <button style={{
                        background: 'var(--color-acid-lime)',
                        color: 'var(--bg-avant-black)',
                        padding: '12px 28px',
                        borderRadius: '999px',
                        fontWeight: 600,
                        fontSize: '14px',
                        border: 'none',
                        cursor: 'pointer'
                    }} onClick={() => scrollToSection('designer-selection')}>
                        Inquire Now
                    </button>
                </div>
            </nav>

            {/* SECTION 1: HERO */}
            <section id="hero" style={{
                minHeight: '100vh',
                display: 'grid',
                gridTemplateColumns: '5fr 7fr',
                padding: '140px 40px 60px',
                gap: '80px',
                position: 'relative'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ marginBottom: '40px' }}>
                        <RotatingHeroText />
                    </div>
                    
                    <p style={{ 
                        fontSize: '1.25rem', 
                        opacity: 0.6, 
                        maxWidth: '480px', 
                        lineHeight: 1.5,
                        marginBottom: '60px'
                    }}>
                        A research-led design archive exploring the intersection of biological form and industrial precision.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: '#292524',
                                    border: '2px solid var(--bg-avant-black)',
                                    marginLeft: i === 1 ? 0 : '-12px',
                                    overflow: 'hidden'
                                }}>
                                    <img src={`/avatars/${i === 1 ? 'despina' : i === 2 ? 'tony' : 'gina'}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1)' }} />
                                </div>
                            ))}
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', opacity: 0.5 }}>TRUSTED BY 14K+ OBSERVERS</span>
                    </div>
                </div>

                <div style={{ position: 'relative', height: '100%', minHeight: '600px' }}>
                    <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '10rem 10rem 24px 24px',
                        overflow: 'hidden',
                        position: 'relative',
                        background: '#1C1917'
                    }}>
                        <img 
                            src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072&auto=format&fit=crop" 
                            alt="Editorial" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
                        />
                        <CatalogLabel id="B4A-X" />
                        <div style={{ position: 'absolute', bottom: '16px', right: '16px', color: 'var(--text-stone)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                             SYNTHESIZED NEURAL STRUCTURE
                        </div>
                    </div>
                    
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px' }}>
                        <StickyNote 
                            title="Volume 01" 
                            description="Now curated — The architectural silhouettes of Autumn/Winter."
                            ctaText="Inquire Now"
                            rotation={6}
                        />
                    </div>
                </div>
            </section>

            <SerratedDivider position="bottom" />

            {/* SECTION 2: DESIGNER SELECTION */}
            <section id="designer-selection" style={{
                padding: '120px 40px',
                background: 'var(--bg-warm-charcoal)',
                minHeight: '100vh'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '80px' }}>
                    <h2 style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '4.5rem',
                        fontWeight: 300,
                        margin: 0
                    }}>
                        Select your <i style={{ fontWeight: 200 }}>Designer</i>
                    </h2>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', opacity: 0.4, letterSpacing: '0.2em' }}>
                        VIEWING ARCHIVE 001 - 004
                    </div>
                </div>

                <div style={{ 
                    display: 'flex', 
                    gap: '32px', 
                    overflowX: 'auto', 
                    paddingBottom: '40px',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }} className="hide-scrollbar">
                    {PERSONAS.map((persona, idx) => (
                        <div key={persona.id} style={{
                            flex: '0 0 420px',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'transform 400ms var(--ease-editorial)',
                            marginTop: idx % 2 === 0 ? '40px' : '0'
                        }} className="card-hover-scale" onClick={() => onStart(persona)}>
                            <div style={{
                                width: '100%',
                                aspectRatio: '3/4',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                background: '#292524',
                                position: 'relative',
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}>
                                <img 
                                    src={persona.image} 
                                    alt={persona.name} 
                                    style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'cover', 
                                        transition: 'all 500ms var(--ease-editorial)'
                                    }} 
                                    className="grayscale-to-color"
                                />
                                <CatalogLabel id={`00${idx + 1}`} />
                            </div>
                            <div style={{ marginTop: '24px' }}>
                                <h3 style={{ 
                                    fontFamily: 'var(--font-serif)', 
                                    fontSize: '2rem', 
                                    fontWeight: 300, 
                                    margin: 0 
                                }}>
                                    {persona.name} <i style={{ fontWeight: 200 }}>Study</i>
                                </h3>
                                <p style={{ 
                                    fontFamily: 'var(--font-mono)', 
                                    fontSize: '11px', 
                                    opacity: 0.4, 
                                    textTransform: 'uppercase', 
                                    marginTop: '8px',
                                    letterSpacing: '0.1em'
                                }}>
                                    SERIES 01 — {persona.specialty}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <SerratedDivider position="top" />

            {/* SECTION 3: FINAL CTA */}
            <section style={{
                padding: '120px 40px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'var(--bg-avant-black)'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '1200px',
                    background: 'var(--color-acid-lime)',
                    borderRadius: '48px',
                    padding: '100px 80px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '40px'
                }}>
                    <div style={{ position: 'absolute', top: '40px', left: '40px', fontSize: '2rem' }}>☆</div>
                    <h2 style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '5rem',
                        color: 'var(--bg-avant-black)',
                        lineHeight: 1.1,
                        margin: 0,
                        maxWidth: '800px',
                        fontWeight: 300
                    }}>
                        Ready to <i style={{ fontWeight: 200 }}>redefine</i> the digital landscape?
                    </h2>
                    
                    <p style={{
                        fontSize: '1.25rem',
                        color: 'rgba(12, 10, 9, 0.7)',
                        maxWidth: '600px',
                        lineHeight: 1.5,
                        marginTop: '20px'
                    }}>
                        We are opening our private studio for 2024 collaborations. Join a network of observers focused on pure aesthetic utility.
                    </p>

                    <div style={{ 
                        width: '100%', 
                        height: '1px', 
                        background: 'rgba(12, 10, 9, 0.1)', 
                        margin: '20px 0' 
                    }} />

                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button style={{
                            background: 'var(--bg-avant-black)',
                            color: 'var(--color-acid-lime)',
                            padding: '20px 48px',
                            borderRadius: '999px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                        }} onClick={() => scrollToSection('designer-selection')}>
                            Submit Application
                        </button>
                        
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(12, 10, 9, 0.4)', textTransform: 'uppercase' }}>
                            NEXT INTAKE: OCTOBER 15TH, 2024
                        </div>
                    </div>
                </div>
            </section>

            <style jsx>{`
                .nav-btn-hover:hover {
                    background: rgba(231, 229, 228, 0.1) !important;
                }
                .card-hover-scale:hover {
                    transform: translateY(-20px);
                }
                .card-hover-scale:hover .grayscale-to-color {
                    filter: grayscale(0) !important;
                    transform: scale(1.05);
                }
                .grayscale-to-color {
                    filter: grayscale(1);
                }
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
