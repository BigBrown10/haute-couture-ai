'use client';

interface LandingOverlayProps {
    exiting: boolean;
    onStart: () => void;
}

export default function LandingOverlay({ exiting, onStart }: LandingOverlayProps) {
    return (
        <div className={`landing-overlay ${exiting ? 'exiting' : ''}`}>
            <div className="landing-card">
                <div className="landing-icon">👁</div>

                <h1 className="landing-title">Haute Couture AI</h1>

                <p className="landing-subtitle">
                    Your brutally honest Hollywood fashion stylist.
                    <br />
                    30 years of experience. 300+ A-list clients. Zero tolerance for mediocrity.
                </p>

                <div className="landing-features">
                    <div className="landing-feature">
                        <span className="landing-feature-icon">🎥</span>
                        Live Video Critique
                    </div>
                    <div className="landing-feature">
                        <span className="landing-feature-icon">🎙️</span>
                        Voice Interaction
                    </div>
                    <div className="landing-feature">
                        <span className="landing-feature-icon">✨</span>
                        AI Outfit Generation
                    </div>
                </div>

                <button
                    className="glass-button landing-cta"
                    onClick={onStart}
                    id="begin-session"
                >
                    Begin Session
                </button>

                <p className="landing-disclaimer">
                    This platform uses AI to provide fashion critique. The stylist persona is deliberately
                    confrontational — prepare for unfiltered honesty. Camera and microphone access required.
                </p>
            </div>
        </div>
    );
}
