export type PersonaId = 'despina' | 'gina' | 'tony' | 'aria';

export interface Persona {
    id: PersonaId;
    name: string;
    specialty: string;
    description: string;
    image: string;
    voice: string;
    mode: 'stylist' | 'designer';
}

export interface GeneratedOutfit {
    id: string;
    imageBase64: string | null;
    caption: string;
    timestamp?: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'agent';
    text: string;
    timestamp: number;
    imageBase64?: string;
    imageCaption?: string;
    thought?: string;
}
