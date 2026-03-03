'use client';

interface GlassControlBarProps {
    micEnabled: boolean;
    onToggleMic: () => void;
    onEndSession: () => void;
    canTryOn: boolean;
    onUploadPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onTryOnItem: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function GlassControlBar({
    micEnabled,
    onToggleMic,
    onEndSession,
    canTryOn,
    onUploadPhoto,
    onTryOnItem,
}: GlassControlBarProps) {
    return (
        <div className="control-bar">
            {/* Upload Button */}
            <label
                className="glass-button control-btn"
                title="Upload Photo"
                aria-label="Upload Photo"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 8px' }}
            >
                <input type="file" accept="image/*" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} onChange={onUploadPhoto} />
                📤
            </label>

            {/* Try On Button */}
            <label
                className={`glass-button control-btn ${canTryOn ? '' : 'disabled'}`}
                title={canTryOn ? "Try On Item" : "Upload a photo first to try on items"}
                aria-label="Try On Item"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: canTryOn ? 'pointer' : 'not-allowed',
                    margin: '0 8px',
                    opacity: canTryOn ? 1 : 0.4
                }}
            >
                <input
                    type="file"
                    accept="image/*"
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
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
