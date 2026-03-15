'use client';

// The user requested to delete all other backgrounds and leave only the 3D trees (Ahornsteig).
const BG_PRESETS = [
    { id: 'outdoor', label: 'Trees Background', file: '/backgrounds/ahornsteig_4k.hdr' }
];

interface BackgroundPickerProps {
    selected: string;
    onSelect: (preset: string) => void;
}

export default function BackgroundPicker({ selected, onSelect }: BackgroundPickerProps) {
    // If there is only one preset, we hide the picker UI completely.
    if (BG_PRESETS.length <= 1) return null;

    return null;
}

export { BG_PRESETS };
