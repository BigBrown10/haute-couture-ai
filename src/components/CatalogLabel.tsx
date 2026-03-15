import React from 'react';

interface CatalogLabelProps {
    id: string;
    status?: 'active' | 'idle';
    className?: string;
}

export default function CatalogLabel({ id, status = 'active', className = '' }: CatalogLabelProps) {
    return (
        <div className={`catalog-label ${className}`} style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(12, 10, 9, 0.4)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 10
        }}>
            <div style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '10px', 
                color: 'rgba(231, 229, 228, 0.5)',
                textTransform: 'uppercase'
            }}>
                Fig. {id}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: status === 'active' ? 'var(--color-acid-lime)' : 'rgba(231, 229, 228, 0.3)'
                }} />
                <span style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '11px', 
                    color: 'var(--text-stone)',
                    letterSpacing: '0.05em'
                }}>
                    TECHNICAL ARCHIVE
                </span>
            </div>
        </div>
    );
}
