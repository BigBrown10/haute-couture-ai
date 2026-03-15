import React from 'react';

interface SerratedDividerProps {
    className?: string;
    style?: React.CSSProperties;
    position?: 'top' | 'bottom';
}

/**
 * Procedural jagged edge divider using radial-gradient masks.
 */
export default function SerratedDivider({ className = '', style = {}, position = 'bottom' }: SerratedDividerProps) {
    return (
        <div 
            className={`serrated-divider ${className}`}
            style={{
                width: '100%',
                height: '16px',
                position: 'relative',
                zIndex: 5,
                maskImage: 'radial-gradient(circle at 10px 0, transparent 0, transparent 5px, black 5px)',
                WebkitMaskImage: 'radial-gradient(circle at 10px 0, transparent 0, transparent 5px, black 5px)',
                maskSize: '20px 10px',
                WebkitMaskSize: '20px 10px',
                maskRepeat: 'repeat-x',
                WebkitMaskRepeat: 'repeat-x',
                background: 'inherit',
                transform: position === 'top' ? 'rotate(180deg)' : 'none',
                marginTop: position === 'top' ? '-16px' : '0',
                marginBottom: position === 'bottom' ? '-16px' : '0',
                ...style
            }}
        />
    );
}
