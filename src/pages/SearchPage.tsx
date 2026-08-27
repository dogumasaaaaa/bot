import { useState, useEffect, useCallback } from 'react';
import { invidious } from '@/lib/invidious';
import { VideoCard, ChannelCard, PlaylistCard, LoadingSpinner, ErrorMessage } from '@/components/VideoCard';
import { useRouter } from '@/lib/router';
import type { VideoObject, ChannelObject, PlaylistObject, SearchFilters } from '@/types/invidious';

export function SearchPage({ query }: { query: string }) {
  const { navigate } = useRouter();
  const [results, setResults] = useState<(VideoObject | ChannelObject | PlaylistObject)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({});

  const load = useCallback(async (pageNum: number) => {
    if (pageNum === 1) {
      setLoading(true);
      setResults([]);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      const data = await invidious.search(query, filters, pageNum);
      const items = data as (VideoObject | ChannelObject | PlaylistObject)[];
      if (items.length === 0) setHasMore(false);
      setResults((prev) => pageNum === 1 ? items : [...prev, ...items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [query, filters]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next);
  };

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters };
    if (value === 'all' || value === '') {
      delete newFilters[key];
    } else {
      (newFilters as Record<string, unknown>)[key] = value;
    }
    setFilters(newFilters);
    setPage(1);
  };

  const videos = results.filter((r) => r.type === 'video') as VideoObject[];
  const channels = results.filter((r) => r.type === 'channel') as ChannelObject[];
  const playlists = results.filter((r) => r.type === 'playlist') as PlaylistObject[];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h2 className="text-lg text-neutral-100 mb-3">Search results for "{query}"</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filters.type || 'all'}
          onChange={(e) => updateFilter('type', e.target.value)}
          className="bg-neutral-800 text-neutral-200 text-sm px-3 py-1.5 rounded-lg border border-neutral-700"
        >
          <option value="all">All</option>
          <option value="video">Videos</option>
          <option value="channel">Channels</option>
          <option value="playlist">Playlists</option>
        </select>
        <select
          value={filters.sort_by || 'relevance'}
          onChange={(e) => updateFilter('sort_by', e.target.value)}
          className="bg-neutral-800 text-neutral-200 text-sm px-3 py-1.5 rounded-lg border border-neutral-700"
        >
          <option value="relevance">Relevance</option>
          <option value="upload_date">Upload date</option>
          <option value="view_count">View count</option>
          <option value="rating">Rating</option>
        </select>
        <select
          value={filters.date || ''}
          onChange={(e) => updateFilter('date', e.target.value)}
          className="bg-neutral-800 text-neutral-200 text-sm px-3 py-1.5 rounded-lg border border-neutral-700"
        >
          <option value="">Any time</option>
          <option value="hour">Last hour</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
        </select>
        <select
          value={filters.duration || ''}
          onChange={(e) => updateFilter('duration', e.target.value)}
          className="bg-neutral-800 text-neutral-200 text-sm px-3 py-1.5 rounded-lg border border-neutral-700"
        >
          <option value="">Any duration</option>
          <option value="short">Short (&lt;4 min)</option>
          <option value="long">Long (&gt;20 min)</option>
        </select>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} onRetry={() => load(1)} />}

      {!loading && !error && (
        <>
          {channels.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm text-neutral-400 uppercase mb-2">Channels</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {channels.map((c) => (
                  <ChannelCard key={c.authorId} channel={c} />
                ))}
              </div>
            </div>
          )}

          {playlists.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm text-neutral-400 uppercase mb-2">Playlists</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {playlists.map((p) => (
                  <PlaylistCard key={p.playlistId} playlist={p} />
                ))}
              </div>
            </div>
          )}

          {videos.length > 0 && (
            <div>
              <h3 className="text-sm text-neutral-400 uppercase mb-2">Videos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {videos.map((v) => (
                  <VideoCard key={v.videoId} video={v} />
                ))}
              </div>
            </div>
          )}

          {results.length === 0 && (
            <p className="text-neutral-400 text-center py-20">No results found.</p>
          )}

          {hasMore && results.length > 0 && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2 bg-neutral-800 text-neutral-200 rounded-lg hover:bg-neutral-700 disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
