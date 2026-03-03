'use client';

interface GlassControlBarProps {
    mode: 'stylist' | 'designer';
    micEnabled: boolean;
    selectedVoice: string;
    onToggleMode: () => void;
    onToggleMic: () => void;
    onChangeVoice: (voice: string) => void;
    onEndSession: () => void;
    canTryOn: boolean;
    onUploadPhoto: () => void;
    onTryOnItem: () => void;
}

export default function GlassControlBar({
    mode,
    micEnabled,
    selectedVoice,
    onToggleMode,
    onToggleMic,
    onChangeVoice,
    onEndSession,
    canTryOn,
    onUploadPhoto,
    onTryOnItem,
}: GlassControlBarProps) {
    return (
        <div className="control-bar">
            {/* Mode Toggle */}
            <button
                className={`glass-button control-btn ${mode === 'designer' ? 'active' : ''}`}
                onClick={onToggleMode}
                title={mode === 'stylist' ? 'Switch to Designer Mode' : 'Switch to Stylist Mode'}
                aria-label="Toggle Mode"
                style={{ width: 'auto', padding: '0 16px', borderRadius: '28px', fontSize: '0.9rem' }}
            >
                {mode === 'stylist' ? '👗 Stylist' : '🎨 Designer'}
            </button>

            <select
                className="voice-select"
                value={selectedVoice}
                onChange={(e) => onChangeVoice(e.target.value)}
                aria-label="Select voice profile"
            >
                <option value="Kore">Despina (Kore) — Smooth</option>
                <option value="Puck">Tony (Puck) — Sneakerhead</option>
                <option value="Aoede">Gina (Aoede) — Bright</option>
                <option value="Charon">Charon — Mature</option>
                <option value="Fenrir">Fenrir — Gravelly</option>
            </select>

            {/* Upload Button */}
            <button
                className="glass-button control-btn"
                onClick={onUploadPhoto}
                title="Upload Photo"
                aria-label="Upload Photo"
            >
                📤
            </button>

            {/* Try On Button */}
            <button
                className={`glass-button control-btn ${canTryOn ? '' : 'danger'} `}
                onClick={onTryOnItem}
                disabled={!canTryOn}
                title="Try On Item"
                aria-label="Try On Item"
            >
                👗
            </button>

            {/* Mic toggle — large center button */}
            <button
                className={`glass-button control-btn large ${micEnabled ? 'mic-on' : 'mic-off'}`}
                onClick={onToggleMic}
                title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
                {micEnabled ? '🎙️' : '🔇'}
            </button>

            {/* End session */}
            <button
                className="glass-button control-btn end-session"
                onClick={onEndSession}
                title="End session"
                aria-label="End session"
            >
                ✕
            </button>
        </div>
    );
}
