'use client';

import { useState, useCallback, KeyboardEvent } from 'react';

interface TextInputProps {
    onSendText: (text: string) => void;
    onRequestOutfit: (prompt: string) => void;
}

export default function TextInput({ onSendText, onRequestOutfit }: TextInputProps) {
    const [text, setText] = useState('');

    const handleSend = useCallback(() => {
        const trimmed = text.trim();
        if (!trimmed) return;

        // Check if it's an outfit generation request
        const lowerText = trimmed.toLowerCase();
        if (
            lowerText.includes('show me') ||
            lowerText.includes('generate') ||
            lowerText.includes('what should i wear') ||
            lowerText.includes('recommend an outfit')
        ) {
            onRequestOutfit(trimmed);
        }

        onSendText(trimmed);
        setText('');
    }, [text, onSendText, onRequestOutfit]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend]
    );

    return (
        <div className="text-input-bar">
            <input
                type="text"
                className="text-input"
                placeholder="Type a message or say &quot;show me what I should wear&quot;..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Message the stylist"
            />
            <button
                className="glass-button send-btn"
                onClick={handleSend}
                disabled={!text.trim()}
                aria-label="Send message"
            >
                →
            </button>
        </div>
    );
}
