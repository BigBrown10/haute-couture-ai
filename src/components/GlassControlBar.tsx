'use client';

interface GlassControlBarProps {
    mode: 'stylist' | 'designer';
    micEnabled: boolean;
    cameraEnabled: boolean;
    selectedVoice: string;
    onToggleMode: () => void;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onChangeVoice: (voice: string) => void;
    onEndSession: () => void;
}

export default function GlassControlBar({
    mode,
    micEnabled,
    cameraEnabled,
    selectedVoice,
    onToggleMode,
    onToggleMic,
    onToggleCamera,
    onChangeVoice,
    onEndSession,
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

            {/* Voice selector */}
            <select
                className="voice-select"
                value={selectedVoice}
                onChange={(e) => onChangeVoice(e.target.value)}
                aria-label="Select voice profile"
            >
                <option value="Despina">Despina — Smooth</option>
                <option value="Gacrux">Gacrux — Mature</option>
                <option value="Zephyr">Zephyr — Bright</option>
                <option value="Aoede">Aoede — Breezy</option>
                <option value="Algenib">Algenib — Gravelly</option>
            </select>

            {/* Camera toggle */}
            <button
                className={`glass-button control-btn ${cameraEnabled ? '' : 'danger'}`}
                onClick={onToggleCamera}
                title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
            >
                {cameraEnabled ? '🎥' : '📵'}
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
