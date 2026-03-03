'use client';

interface GlassControlBarProps {
    micEnabled: boolean;
    selectedVoice: string;
    onToggleMic: () => void;
    onChangeVoice: (voice: string) => void;
    onEndSession: () => void;
    canTryOn: boolean;
    onUploadPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onTryOnItem: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function GlassControlBar({
    micEnabled,
    selectedVoice,
    onToggleMic,
    onChangeVoice,
    onEndSession,
    canTryOn,
    onUploadPhoto,
    onTryOnItem,
}: GlassControlBarProps) {
    return (
        <div className="control-bar">
            {/* Voice selector */}
            <select
                className="voice-select"
                value={selectedVoice}
                onChange={(e) => onChangeVoice(e.target.value)}
                aria-label="Select voice profile"
            >
                <option value="Kore">Smooth</option>
                <option value="Puck">Sneakerhead</option>
                <option value="Aoede">Bright</option>
                <option value="Charon">Mature</option>
                <option value="Fenrir">Gravelly</option>
            </select>

            {/* Upload Button */}
            <label
                className="glass-button control-btn upload-label"
                title="Upload Photo"
                aria-label="Upload Photo"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: 0 }}
            >
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onUploadPhoto} />
                📤
            </label>

            {/* Try On Button */}
            <label
                className={`glass-button control-btn tryon-label ${canTryOn ? '' : 'disabled'}`}
                title="Try On Item"
                aria-label="Try On Item"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: canTryOn ? 'pointer' : 'not-allowed',
                    margin: 0,
                    opacity: canTryOn ? 1 : 0.5
                }}
            >
                <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={canTryOn ? onTryOnItem : undefined}
                    disabled={!canTryOn}
                />
                👗
            </label>

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
