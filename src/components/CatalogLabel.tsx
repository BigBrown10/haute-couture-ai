import React from 'react';

interface CatalogLabelProps {
    title: string;
    subtitle: string;
    status?: 'active' | 'idle';
    className?: string;
}

export default function CatalogLabel({ title, subtitle, status = 'active', className = '' }: CatalogLabelProps) {
    return (
        <div className={`catalog-label ${className}`} style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(12, 10, 9, 0.4)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            zIndex: 10,
            maxWidth: 'calc(100% - 32px)'
        }}>
            <div style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '12px', 
                fontWeight: 700,
                color: 'var(--text-stone)',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                lineHeight: 1.1
            }}>
                {title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: status === 'active' ? 'var(--color-acid-lime)' : 'rgba(231, 229, 228, 0.3)',
                    flexShrink: 0
                }} />
                <span style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '10px', 
                    color: 'rgba(231, 229, 228, 0.6)',
                    letterSpacing: '0em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {subtitle}
                </span>
            </div>
        </div>
    );
}
