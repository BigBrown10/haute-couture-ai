'use client';

import React, { useState, useEffect, useRef } from 'react';

const WORDS = ['Fashion critic', '3D AI Designer', '3D AI Agent'];

export default function RotatingHeroText() {
    const [index, setIndex] = useState(0);
    const [isMelting, setIsMelting] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const rotate = () => {
            setIsMelting(true);
            setTimeout(() => {
                setIndex((prev) => (prev + 1) % WORDS.length);
                setIsMelting(false);
            }, 300);
        };

        timerRef.current = setInterval(rotate, 3500);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '0px',
            textAlign: 'left',
            marginTop: '10rem',
            marginBottom: '3rem',
            zIndex: 10,
            userSelect: 'none',
            whiteSpace: 'nowrap',
            width: '100%'
        }}>
            {/* Inline SVG Filter for Gooey Effect */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    <filter id="gooey-filter">
                        <feGaussianBlur 
                            in="SourceGraphic" 
                            stdDeviation={isMelting ? '12' : '0'} 
                            result="blur" 
                        />
                        <feColorMatrix 
                            in="blur" 
                            mode="matrix" 
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" 
                            result="gooey" 
                        />
                        <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
                    </filter>
                </defs>
            </svg>

            <span style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(2.5rem, 8vw, 6rem)',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: '#f6f4f0',
                letterSpacing: '-0.05em',
                lineHeight: 0.85,
                textAlign: 'left'
            }}>
                meet your
            </span>

            <div style={{ 
                filter: 'url(#gooey-filter)',
                transition: 'filter 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                height: 'clamp(2rem, 7vw, 5.5rem)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: '100%'
            }}>
                <span 
                    key={WORDS[index]}
                    style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 'clamp(2rem, 7vw, 5.5rem)',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        fontStyle: 'normal',
                        color: 'var(--color-acid-lime)',
                        letterSpacing: '-0.05em',
                        display: 'block',
                        transition: 'opacity 0.2s',
                        opacity: isMelting ? 0.3 : 1,
                        lineHeight: 0.85,
                        textAlign: 'left'
                    }}
                >
                    {WORDS[index]}
                </span>
            </div>
        </div>
    );
}
