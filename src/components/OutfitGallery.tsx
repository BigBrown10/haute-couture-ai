'use client';

import { useState, useRef, useEffect } from 'react';
import type { GeneratedOutfit } from '@/app/page';

interface OutfitGalleryProps {
    outfits: GeneratedOutfit[];
}

export default function OutfitGallery({ outfits }: OutfitGalleryProps) {
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest look
    useEffect(() => {
        if (gridRef.current) {
            gridRef.current.scrollTo({
                top: gridRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [outfits.length]);

    const handleDownload = (imageBase64: string, id: string) => {
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${imageBase64}`;
        link.download = `bestie-look-${id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={`lookbook-tray ${outfits.length > 0 ? 'is-visible' : ''}`}>
            <div className="lookbook-header">
                <h3>My Lookbook</h3>
                <span className="count">{outfits.length} LOOKS</span>
            </div>

            <div className="lookbook-grid" ref={gridRef}>
                {outfits.map((outfit) => (
                    <div key={outfit.id} className="lookbook-card glass-card">
                        <div className="card-media" onClick={() => {
                            if (outfit.imageBase64) setFullscreenImage(`data:image/jpeg;base64,${outfit.imageBase64}`);
                        }}>
                            {outfit.imageBase64 ? (
                                <img
                                    src={`data:image/jpeg;base64,${outfit.imageBase64}`}
                                    alt={outfit.caption}
                                    className="lookbook-img"
                                />
                            ) : (
                                <div className="lookbook-placeholder">👗 Sketching...</div>
                            )}
                        </div>

                        <div className="card-info">
                            <p className="caption">{outfit.caption}</p>
                            <div className="card-actions">
                                <button
                                    className="action-btn download-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (outfit.imageBase64) handleDownload(outfit.imageBase64, outfit.id);
                                    }}
                                    title="Download Look"
                                >
                                    📥 Save
                                </button>
                                <button
                                    className="action-btn view-btn"
                                    onClick={() => {
                                        if (outfit.imageBase64) setFullscreenImage(`data:image/jpeg;base64,${outfit.imageBase64}`);
                                    }}
                                >
                                    🔍 View
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Fullscreen overlay */}
            {fullscreenImage && (
                <div className="outfit-fullscreen" onClick={() => setFullscreenImage(null)}>
                    <div className="close-fullscreen">✕</div>
                    <img src={fullscreenImage} alt="Generated outfit fullscreen view" />
                </div>
            )}
        </div>
    );
}
