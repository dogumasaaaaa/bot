import { useState, useEffect, useCallback } from 'react';
import { Play, ListVideo } from 'lucide-react';
import { invidious } from '@/lib/invidious';
import { useRouter } from '@/lib/router';
import { LoadingSpinner, ErrorMessage } from '@/components/VideoCard';
import { formatLength, formatViewCount, getBestThumbnail } from '@/lib/format';
import type { PlaylistDetails } from '@/types/invidious';

export function PlaylistPage({ playlistId }: { playlistId: string }) {
  const { navigate } = useRouter();
  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invidious.getPlaylist(playlistId);
      setPlaylist(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlist');
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!playlist) return <ErrorMessage message="Playlist not found" />;

  const playAll = () => {
    if (playlist.videos.length > 0) {
      navigate({ name: 'watch', videoId: playlist.videos[0].videoId, list: playlistId });
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
      {/* Playlist info */}
      <div className="lg:w-80 shrink-0">
        <div className="bg-neutral-800 rounded-lg p-4 sticky top-20">
          <h1 className="text-lg font-medium text-neutral-100 mb-2">{playlist.title}</h1>
          <button
            onClick={() => playlist.authorId && navigate({ name: 'channel', channelId: playlist.authorId })}
            className="text-sm text-neutral-400 hover:text-neutral-200 block mb-3"
          >
            {playlist.author}
          </button>
          <p className="text-xs text-neutral-500 mb-3">
            {playlist.videoCount} videos
          </p>
          {playlist.description && (
            <p className="text-sm text-neutral-400 mb-3 line-clamp-3">{playlist.description}</p>
          )}
          <button
            onClick={playAll}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-200 text-neutral-900 rounded-full text-sm font-medium hover:bg-neutral-300"
          >
            <Play size={18} fill="currentColor" />
            Play all
          </button>
        </div>
      </div>

      {/* Video list */}
      <div className="flex-1 space-y-1">
        {playlist.videos.map((v, i) => (
          <button
            key={v.videoId + i}
            onClick={() => navigate({ name: 'watch', videoId: v.videoId, list: playlistId })}
            className="w-full flex gap-3 p-2 rounded-lg hover:bg-neutral-800 text-left"
          >
            <span className="text-neutral-500 text-sm w-6 text-center shrink-0 pt-3">{i + 1}</span>
            <div className="relative w-32 aspect-video bg-neutral-800 rounded-lg overflow-hidden shrink-0">
              {getBestThumbnail(v.videoThumbnails) && (
                <img src={getBestThumbnail(v.videoThumbnails)} alt="" className="w-full h-full object-cover" loading="lazy" />
              )}
              {v.lengthSeconds > 0 && (
                <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                  {formatLength(v.lengthSeconds)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm text-neutral-100 line-clamp-2">{v.title}</h3>
              {v.author && <p className="text-xs text-neutral-500 mt-1">{v.author}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
