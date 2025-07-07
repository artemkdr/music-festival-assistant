import { Artist, Festival } from '@/lib/schemas';
import { getYouTubeSearchArtistUrl, getGoogleArtistUrl } from '@/lib/utils/festival-util';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { FaYoutube, FaGoogle, FaSpotify } from 'react-icons/fa';

interface ArtistInfoProps {
    festival: Festival;
    artist: Artist;
}

export const ArtistInfo = (props: ArtistInfoProps) => {
    const t = useTranslations('FestivalPage');
    const { artist, festival } = props;
    return (
        <>
            {/* genres, max 5 */}
            {artist.genre && artist.genre.length > 0 && (
                <div className="px-2 text-foreground/70 animate-fade-in">
                    <span className="text-xs">{artist.genre.slice(0, 5).join(' | ')}</span>
                </div>
            )}
            {artist.streamingLinks?.spotify && (
                <Link href={artist.streamingLinks?.spotify} target="_blank" rel="noopener noreferrer" className="link-secondary p-2 rounded-full bg-primary/15 animate-fade-in" title="Spotify">
                    <FaSpotify size={24} />
                </Link>
            )}
            {artist.id && (
                <Link
                    href={getYouTubeSearchArtistUrl(artist.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-destructive p-2 rounded-full bg-primary/15 animate-fade-in"
                    title={t('WatchOnYouTube')}
                >
                    <FaYoutube size={24} />
                </Link>
            )}

            <Link
                href={getGoogleArtistUrl(artist.name, festival.website, festival.name)}
                target="_blank"
                rel="noopener noreferrer"
                title={t('WebSearch')}
                className="link-primary p-2 rounded-full bg-primary/15 animate-fade-in"
            >
                <FaGoogle size={24} />
            </Link>
        </>
    );
};
