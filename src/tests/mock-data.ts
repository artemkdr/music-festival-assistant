/**
 * Mock data for festivals and artists
 * This will be replaced with real data sources in production
 */
import type { Artist, Festival } from '@/lib/schemas';

/**
 * Mock artists data
 */
export const mockArtists: Artist[] = [
    {
        id: 'artist-1',
        name: 'Arctic Monkeys',
        genre: ['Alternative Rock', 'Indie Rock'],
        description: 'British rock band known for their energetic live performances and catchy melodies.',
        imageUrl: 'https://example.com/arctic-monkeys.jpg',
        streamingLinks: {
            spotify: 'https://open.spotify.com/artist/7Ln80lUS6He07XvHI8qqHH',
            youtube: 'https://www.youtube.com/c/ArcticMonkeys',
        },
        socialLinks: {
            website: 'https://arcticmonkeys.com',
            instagram: 'https://instagram.com/arcticmonkeys',
        },
    },
    {
        id: 'artist-2',
        name: 'Disclosure',
        genre: ['Electronic', 'Deep House', 'UK Garage'],
        description: 'Electronic music duo from Surrey, England, pioneers of the UK garage revival.',
        imageUrl: 'https://example.com/disclosure.jpg',
        streamingLinks: {
            spotify: 'https://open.spotify.com/artist/6nS5roXSAGhTGr34W6n7Et',
            appleMusic: 'https://music.apple.com/artist/disclosure/476995421',
        },
        socialLinks: {
            website: 'https://disclosure.co.uk',
        },
    },
    {
        id: 'artist-3',
        name: 'Tame Impala',
        genre: ['Psychedelic Rock', 'Electronic', 'Dream Pop'],
        description: 'Australian psychedelic music project led by Kevin Parker, known for dreamy soundscapes.',
        imageUrl: 'https://example.com/tame-impala.jpg',
        streamingLinks: {
            spotify: 'https://open.spotify.com/artist/5INjqkS1o8h1imAzPqGZBb',
        },
        socialLinks: {
            website: 'https://tameimpala.com',
            instagram: 'https://instagram.com/tameimpala',
        },
    },
    {
        id: 'artist-4',
        name: 'FKA twigs',
        genre: ['Alternative R&B', 'Art Pop', 'Electronic'],
        description: 'British singer-songwriter known for her ethereal vocals and innovative music videos.',
        imageUrl: 'https://example.com/fka-twigs.jpg',
        streamingLinks: {
            spotify: 'https://open.spotify.com/artist/6nB0iY1cjSY1KyhYyuIIKH',
            appleMusic: 'https://music.apple.com/artist/fka-twigs/639977049',
        },
        socialLinks: {
            website: 'https://fkatwigs.com',
            instagram: 'https://instagram.com/fkatwigs',
        },
    },
    {
        id: 'artist-5',
        name: 'Glass Animals',
        genre: ['Indie Pop', 'Electronic', 'Alternative'],
        description: 'British indie rock band known for their unique sound and viral hit "Heat Waves".',
        imageUrl: 'https://example.com/glass-animals.jpg',
        streamingLinks: {
            spotify: 'https://open.spotify.com/artist/4yvcSjfu4PC0CYQyLy4wSq',
        },
        socialLinks: {
            website: 'https://glassanimals.com',
        },
    },
    {
        id: 'artist-6',
        name: 'Bicep',
        genre: ['Electronic', 'Ambient', 'Techno'],
        description: 'Northern Irish electronic music duo known for their emotional electronic music.',
        imageUrl: 'https://example.com/bicep.jpg',
        streamingLinks: {
            spotify: 'https://open.spotify.com/artist/73A3bLnfnz5BoQjb4gNCga',
            youtube: 'https://www.youtube.com/c/BicepMusic',
        },
        socialLinks: {
            website: 'https://bicepmusic.co.uk',
            instagram: 'https://instagram.com/bicepmusic',
        },
    },
];

/**
 * Mock festival data
 */
export const mockFestival: Festival = {
    id: 'festival-1',
    name: 'Summer Sound Festival 2024',
    description: 'A three-day celebration of the best in indie, electronic, and alternative music. Join us for an unforgettable weekend of music, art, and community.',
    location: 'Victoria Park, London, UK',
    website: 'https://summersoundfestival.com',
    imageUrl: 'https://example.com/summer-sound-festival.jpg',
    lineup: [
        {
            id: 'act-1',
            festivalName: 'Summer Sound Festival 2024',
            date: '2024-07-20',
            artistName: 'Arctic Monkeys',
            time: '20:00 - 21:30',
            stage: 'Main Stage',
        },
        {
            id: 'act-1',
            festivalName: 'Summer Sound Festival 2024',
            date: '2024-07-20',
            artistName: 'Disclosure',
            time: '22:00 - 23:30',
            stage: 'Electronic Stage',
        },
    ],
};

/**
 * Available music genres for user preferences
 */
export const availableGenres = [
    'Alternative Rock',
    'Indie Rock',
    'Electronic',
    'Deep House',
    'Techno',
    'Ambient',
    'UK Garage',
    'Psychedelic Rock',
    'Dream Pop',
    'Alternative R&B',
    'Art Pop',
    'Indie Pop',
    'Alternative',
    'Pop',
    'Hip Hop',
    'Jazz',
    'Classical',
    'Folk',
    'Country',
    'Reggae',
    'Punk',
    'Metal',
];
