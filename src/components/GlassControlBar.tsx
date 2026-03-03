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
                className="glass-button secondary"
                title="Upload Photo"
                aria-label="Upload Photo"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 8px', padding: '0 20px', borderRadius: '28px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
            >
                <input type="file" accept="image/*" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} onChange={onUploadPhoto} />
                📸 Upload
            </label>

            {/* Try On Button */}
            <label
                className={`glass-button primary ${canTryOn ? '' : 'disabled'}`}
                title={canTryOn ? "Try On Item" : "Upload a photo first to try on items"}
                aria-label="Try On Item"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: canTryOn ? 'pointer' : 'not-allowed',
                    margin: '0 8px',
                    padding: '0 20px',
                    borderRadius: '28px',
                    fontSize: '0.9rem',
                    opacity: canTryOn ? 1 : 0.4,
                    whiteSpace: 'nowrap'
                }}
            >
                <input
                    type="file"
                    accept="image/*"
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                    onChange={canTryOn ? onTryOnItem : undefined}
                    disabled={!canTryOn}
                />
                👗 Try On
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
