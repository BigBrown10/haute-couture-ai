import React from 'react';

const FEATURES = [
    {
        id: '01',
        category: 'VOICE',
        title: 'UNFILTERED VOICE INTERACTION',
        description: 'No typing required. Speak naturally and get instant, brutally honest feedback. Professional styling advice on demand.'
    },
    {
        id: '02',
        category: 'GEN',
        title: 'CONVERSATIONAL OUTFIT GENERATION',
        description: 'Describe your vision and watch as the system instantly generates and edits bespoke garments before your eyes.'
    },
    {
        id: '03',
        category: 'AVATAR',
        title: 'TRUE-TO-LIFE 3D AVATARS',
        description: 'Fully rigged, photorealistic models with flawless physics for an incredibly accurate virtual try-on experience.'
    },
    {
        id: '04',
        category: 'INTERFACE',
        title: 'FRICTIONLESS SPLIT-SCREEN UI',
        description: 'Manage the 3D environment and the wardrobe simultaneously without ever breaking the conversation.'
    },
    {
        id: '05',
        category: 'STUDIO',
        title: 'STUDIO SUITE',
        description: 'A complete creative suite for high-fidelity garment manipulation and detail refinement.'
    },
    {
        id: '06',
        category: 'VIRTUAL TRY-ON',
        title: 'VIRTUAL TRY-ON',
        description: 'Real-time physics-based fitting to see exactly how fabrics drape and move on your unique form.'
    }
];

export default function FeatureGrid() {
    return (
        <section id="features" style={{
            padding: '60px 40px',
            maxWidth: '1200px',
            margin: '0 auto',
            width: '100%'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '24px'
            }}>
                {FEATURES.map((feature) => (
                    <div key={feature.id} style={{
                        background: 'rgba(231, 229, 228, 0.005)',
                        border: '1px solid rgba(255, 255, 255, 0.02)',
                        borderRadius: '16px',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        transition: 'all 500ms var(--ease-editorial)',
                        cursor: 'default',
                        position: 'relative',
                        overflow: 'hidden'
                    }} className="feature-card-hover">
                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            color: 'rgba(231, 229, 228, 0.2)',
                            display: 'flex',
                            gap: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em'
                        }}>
                            <span>{feature.id} /</span>
                            <span>{feature.category}</span>
                        </div>
                        
                        <h3 style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '1rem',
                            fontWeight: 700,
                            margin: 0,
                            lineHeight: 1.1,
                            letterSpacing: '-0.01em',
                            color: 'var(--text-stone)',
                            opacity: 0.9
                        }}>
                            {feature.title}
                        </h3>
                        
                        <p style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            lineHeight: 1.4,
                            color: 'rgba(231, 229, 228, 0.4)',
                            margin: 0,
                            maxWidth: '220px'
                        }}>
                            {feature.description}
                        </p>
                    </div>
                ))}
            </div>
            <style jsx>{`
                .feature-card-hover:hover {
                    background: rgba(231, 229, 228, 0.02) !important;
                    border-color: rgba(255, 255, 255, 0.06) !important;
                    transform: translateY(-2px);
                }
            `}</style>
        </section>
    );
}
