import React from 'react';

interface StickyNoteProps {
    title: string;
    description?: string;
    ctaText?: string;
    onClick?: () => void;
    rotation?: number;
    className?: string;
}

export default function StickyNote({ 
    title, 
    description, 
    ctaText, 
    onClick, 
    rotation = 2, 
    className = '' 
}: StickyNoteProps) {
    return (
        <div 
            onClick={onClick}
            className={`sticky-note-cta ${className}`}
            style={{
                background: 'var(--color-acid-lime)',
                color: 'var(--bg-avant-black)',
                padding: '40px',
                borderRadius: '24px',
                transform: `rotate(${rotation}deg)`,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 300ms var(--ease-editorial)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}
        >
            <h3 style={{ 
                fontFamily: 'var(--font-serif)', 
                fontSize: '2rem', 
                margin: 0,
                fontWeight: 300,
                lineHeight: 1.1
            }}>
                {title}
            </h3>
            {description && (
                <p style={{ 
                    fontFamily: 'var(--font-sans)', 
                    fontSize: '1rem', 
                    opacity: 0.8,
                    margin: 0,
                    lineHeight: 1.4
                }}>
                    {description}
                </p>
            )}
            {ctaText && (
                <div style={{ 
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '1px solid rgba(12, 10, 9, 0.1)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    {ctaText}
                </div>
            )}
            
            {/* Interactive hover effect handles via CSS-in-JS logic would go here if not using a separate CSS file,
                but for simplicity we'll just use the inline style transition. */}
            <style jsx>{`
                .sticky-note-cta:hover {
                    transform: rotate(0deg) scale(1.02);
                }
            `}</style>
        </div>
    );
}
