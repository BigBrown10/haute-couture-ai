'use client';

interface AgentThinkingProps {
    status: string;
}

export default function AgentThinking({ status }: AgentThinkingProps) {
    return (
        <div className="thinking-indicator glass-card">
            <div className="thinking-dots">
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
            </div>
            <span>{status}</span>
        </div>
    );
}
