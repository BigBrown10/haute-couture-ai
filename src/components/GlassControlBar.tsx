'use client';

interface GlassControlBarProps {
    micEnabled: boolean;
    onToggleMic: () => void;
    onEndSession: () => void;
    canTryOn: boolean;
    onUploadPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onTryOnItem: (e: React.ChangeEvent<HTMLInputElement>) => void;
    hideTryOn?: boolean;
}

export default function GlassControlBar({
    micEnabled,
    onToggleMic,
    onEndSession,
    canTryOn,
    onUploadPhoto,
    onTryOnItem,
    hideTryOn = false,
}: GlassControlBarProps) {
    return (
        <div className="control-bar">
            {/* Upload Button */}
            <div className="control-item">
                <label
                    className="glass-button control-btn"
                    title="Upload Base Model"
                    aria-label="Upload Base Model"
                >
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onUploadPhoto} />
                    <span style={{ fontSize: '1.4rem' }}>📤</span>
                </label>
                <span className="control-label">Upload</span>
            </div>

            {/* Try On Button */}
            {!hideTryOn && (
                <div className="control-item">
                    <label
                        className={`glass-button control-btn ${canTryOn ? 'try-on-ready' : 'try-on-disabled'}`}
                        title={canTryOn ? "Try On Garment" : "Upload a photo first to try on items"}
                        aria-label="Try On Garment"
                    >
                        <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={canTryOn ? onTryOnItem : undefined}
                            disabled={!canTryOn}
                        />
                        <span style={{ fontSize: '1.4rem' }}>👗</span>
                    </label>
                    <span className="control-label" style={{ opacity: canTryOn ? 1 : 0.5 }}>Try Fit</span>
                </div>
            )}

            {/* Mic toggle — large center button */}
            <div className="control-item">
                <button
                    className={`glass-button control-btn large ${micEnabled ? 'mic-on' : 'mic-off'}`}
                    onClick={onToggleMic}
                    title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                    aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                    {micEnabled ? '🎙️' : '🔇'}
                </button>
                <span className="control-label">{micEnabled ? 'Mute' : 'Unmute'}</span>
            </div>

            {/* End session */}
            <div className="control-item">
                <button
                    className="glass-button control-btn end-session"
                    onClick={onEndSession}
                    title="End session"
                    aria-label="End session"
                >
                    ✕
                </button>
                <span className="control-label text-danger">End</span>
            </div>
        </div>
    );
}
