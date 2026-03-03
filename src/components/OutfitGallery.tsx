'use client';

import { useState } from 'react';
import type { GeneratedOutfit } from '@/app/page';

interface OutfitGalleryProps {
    outfits: GeneratedOutfit[];
}

export default function OutfitGallery({ outfits }: OutfitGalleryProps) {
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

    return (
        <>
            <div className="outfit-gallery glass-panel">
                <div className="gallery-header">Generated Looks</div>

                {outfits.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">✨</div>
                        <div className="empty-state-text">
                            Ask the stylist to recommend an outfit and the AI will generate it here.
                        </div>
                    </div>
                ) : (
                    outfits.map((outfit) => (
                        <div
                            key={outfit.id}
                            className="outfit-card glass-card"
                            onClick={() => {
                                if (outfit.imageBase64) {
                                    setFullscreenImage(
                                        `data:image/jpeg;base64,${outfit.imageBase64}`
                                    );
                                }
                            }}
                        >
                            {outfit.imageBase64 ? (
                                <img
                                    src={`data:image/jpeg;base64,${outfit.imageBase64}`}
                                    alt={outfit.caption}
                                    className="outfit-image"
                                />
                            ) : (
                                <div className="outfit-placeholder">👗</div>
                            )}
                            <div className="outfit-caption">{outfit.caption}</div>
                        </div>
                    ))
                )}
            </div>

            {/* Fullscreen overlay */}
            {fullscreenImage && (
                <div
                    className="outfit-fullscreen"
                    onClick={() => setFullscreenImage(null)}
                >
                    <img src={fullscreenImage} alt="Generated outfit fullscreen view" />
                </div>
            )}
        </>
    );
}
