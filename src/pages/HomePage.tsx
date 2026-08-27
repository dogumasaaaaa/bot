import { useState, useEffect, useCallback } from 'react';
import { invidious } from '@/lib/invidious';
import { VideoGrid, LoadingSpinner, ErrorMessage } from '@/components/VideoCard';
import type { VideoObject } from '@/types/invidious';

const REGIONS = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'IN', name: 'India' },
  { code: 'KR', name: 'South Korea' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'RU', name: 'Russia' },
];

export function HomePage() {
  const [videos, setVideos] = useState<VideoObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState('US');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invidious.getTrending(region);
      setVideos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trending videos');
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-lg font-medium text-neutral-100">Trending</h1>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="bg-neutral-800 text-neutral-200 text-sm px-3 py-1.5 rounded-lg border border-neutral-700"
        >
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>{r.name}</option>
          ))}
        </select>
      </div>
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} onRetry={load} />}
      {!loading && !error && <VideoGrid videos={videos} />}
    </div>
  );
}
