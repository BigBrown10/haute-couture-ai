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

export const PERSONAS: Persona[] = [
    {
        id: 'despina',
        name: 'Despina',
        specialty: 'Chic Parisian Stylist',
        description: 'Effortlessly chic and sharp. She is the sophisticated older sister you always wanted.',
        image: '/avatars/despina.png',
        voice: 'Kore',
        mode: 'stylist'
    },
    {
        id: 'tony',
        name: 'Tony',
        specialty: 'Streetwear Expert',
        description: 'The effortlessly cool brother who knows every drop.',
        image: '/avatars/tony.png',
        voice: 'Puck',
        mode: 'stylist'
    },
    {
        id: 'gina',
        name: 'Gina',
        specialty: 'Your Glam Bestie',
        description: 'Bubbly, energetic, and your biggest hype woman!',
        image: '/avatars/gina.png',
        voice: 'Aoede',
        mode: 'stylist'
    },
    {
        id: 'aria',
        name: 'Aria',
        specialty: '3D AI Designer',
        description: 'Sophisticated, precise, and visionary AI Designer.',
        image: '/avatars/aria.png',
        voice: 'Aoede',
        mode: 'designer'
    }
];
