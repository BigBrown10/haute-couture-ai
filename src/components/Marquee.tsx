import React from 'react';

export default function Marquee() {
    const text = "Zaute is your fashion co-pilot. A 3D AI fashion agent designed to synthesize stunning silhouettes through real-time agent interaction. — ";
    
    return (
        <div style={{
            width: '100%',
            overflow: 'hidden',
            background: 'var(--color-acid-lime)',
            padding: '16px 0',
            borderTop: '0.5px solid rgba(0,0,0,0.1)',
            borderBottom: '0.5px solid rgba(0,0,0,0.1)',
            zIndex: 20,
            position: 'relative',
            marginTop: '-12px',
            transform: 'rotate(-0.5deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="animate-marquee" style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                    fontWeight: 800,
                    color: 'black',
                    letterSpacing: '-0.02em',
                    paddingRight: '4rem',
                    lineHeight: 1
                }}>
                    {text.repeat(10)}
                </span>
            </div>
        </div>
    );
}
