'use client';

import React, { useState, useEffect, useRef } from 'react';

const WORDS = ['Fashion critic', '3D AI Designer', '3D AI Agents'];

export default function RotatingHeroText() {
    const [index, setIndex] = useState(0);
    const [isMelting, setIsMelting] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const rotate = () => {
            // Start the "melt"
            setIsMelting(true);
            
            // Wait for peak blur before swapping text
            setTimeout(() => {
                setIndex((prev) => (prev + 1) % WORDS.length);
                // Snap back
                setIsMelting(false);
            }, 300); // Fast, aggressive transition
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
            alignItems: 'center',
            gap: '0.2rem',
            textAlign: 'center',
            marginTop: '10rem',
            marginBottom: '3rem',
            zIndex: 10,
            userSelect: 'none'
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
                fontFamily: 'var(--font-acid-heading)',
                fontSize: 'clamp(2.6rem, 8vw, 6.6rem)',
                textTransform: 'uppercase',
                fontWeight: 800,
                color: '#f6f4f0',
                letterSpacing: '-0.05em',
                lineHeight: 1
            }}>
                meet your
            </span>

            <div style={{ 
                filter: 'url(#gooey-filter)',
                transition: 'filter 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                height: 'clamp(2.6rem, 8vw, 6.6rem)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <span 
                    key={WORDS[index]} // Trigger enter animation if needed, but filter handles the transition vibe
                    style={{
                        fontFamily: 'var(--font-acid-heading)',
                        fontSize: 'clamp(2.6rem, 8vw, 6.6rem)',
                        textTransform: 'uppercase',
                        fontWeight: 900,
                        color: 'var(--color-acid-green)',
                        letterSpacing: '-0.03em',
                        display: 'block',
                        transition: 'opacity 0.2s',
                        opacity: isMelting ? 0.3 : 1,
                        lineHeight: 1
                    }}
                >
                    {WORDS[index]}
                </span>
            </div>
        </div>
    );
}
