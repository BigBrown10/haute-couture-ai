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
                className="glass-button control-btn action-btn tooltip-container"
                title="Upload Base Model"
                aria-label="Upload Base Model"
            >
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onUploadPhoto} />
                <span style={{ fontSize: '1.5rem' }}>📤</span>
                <span className="tooltip">Upload</span>
            </label>

            {/* Try On Button */}
            <label
                className={`glass-button control-btn action-btn tooltip-container ${canTryOn ? 'try-on-ready' : 'try-on-disabled'}`}
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
                <span style={{ fontSize: '1.5rem' }}>👗</span>
                <span className="tooltip">Try Fit</span>
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
