'use client';

import { useRef, useEffect } from 'react';
import type { TranscriptMessage } from '@/app/page';

interface TranscriptPanelProps {
    messages: TranscriptMessage[];
}

/**
 * Fashion terms that get highlighted with gold accent
 */
const FASHION_TERMS = [
    'structural integrity', 'drape', 'silhouette', 'bias cut', 'dart',
    'placket', 'yoke', 'proportion', 'A-line', 'anti-fit', 'haute couture',
    'tchotchke', 'bespoke', 'chromatic', 'color temperature', 'undertone',
    'warm', 'cool', 'intensity', 'saturation', 'complementary', 'analogous',
    'empire waist', 'column', 'cocoon', 'novelty', 'artisanal', 'ready-to-wear',
    'Met Gala', 'Oscars', 'Academy Awards', 'red carpet', 'runway',
];

function highlightFashionTerms(text: string): string {
    let result = text;
    for (const term of FASHION_TERMS) {
        const regex = new RegExp(`\\b(${term})\\b`, 'gi');
        result = result.replace(regex, '<span class="fashion-term">$1</span>');
    }
    return result;
}

export default function TranscriptPanel({ messages }: TranscriptPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="transcript-panel glass-panel" ref={scrollRef}>
            <div className="transcript-header">Live Critique</div>

            {messages.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">💬</div>
                    <div className="empty-state-text">
                        The stylist is watching. Present your outfit and prepare for the truth.
                    </div>
                </div>
            ) : (
                messages.map((msg) => (
                    <div key={msg.id} className={`transcript-message ${msg.role}`}>
                        <div className="transcript-role">
                            {msg.role === 'agent' ? '👁 Stylist' : '🧑 You'}
                        </div>
                        <div
                            dangerouslySetInnerHTML={{
                                __html: highlightFashionTerms(msg.text),
                            }}
                        />
                    </div>
                ))
            )}
        </div>
    );
}
