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
        <div className="atelier-container">
            <div className="atelier-header">
                <h2>
                    <span className="text-gold">HEARTS</span>{' '}
                    <span className="text-silver">AI Atelier</span>
                </h2>
                <p>Your Design Assets & Patterns</p>
            </div>

            <div className="atelier-grid" ref={gridRef}>
                {/* User's Generated Outfits */}
                {outfits.map((outfit) => (
                    <div key={outfit.id} className="atelier-card generated" onClick={() => {
                        if (outfit.imageBase64) setFullscreenImage(`data:image/jpeg;base64,${outfit.imageBase64}`);
                    }}>
                        {outfit.imageBase64 ? (
                            <img
                                src={`data:image/jpeg;base64,${outfit.imageBase64}`}
                                alt="Generated Asset"
                                className="atelier-img"
                            />
                        ) : (
                            <div className="atelier-placeholder-inner loading">
                                <div className="spinner"></div>
                            </div>
                        )}
                        <span className="atelier-label">{outfit.id.slice(0, 16)}...</span>

                        {/* Download button overlaid */}
                        {outfit.imageBase64 && (
                            <button
                                className="download-fab"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(outfit.imageBase64 as string, outfit.id);
                                }}
                            >
                                📥
                            </button>
                        )}
                    </div>
                ))}

                {/* Fill empty slots to always show the 2 placeholder cards like the mockup */}
                {Array.from({ length: Math.max(0, 2 - outfits.length) }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="atelier-card empty">
                        <div className="atelier-placeholder-inner"></div>
                        <span className="atelier-label">Generated Image {outfits.length + idx + 1}</span>
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
