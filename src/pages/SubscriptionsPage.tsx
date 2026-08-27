import { useState, useEffect, useCallback } from 'react';
import { invidious } from '@/lib/invidious';
import { useAuth } from '@/lib/auth';
import { useSubscriptions } from '@/lib/hooks';
import { VideoGrid, LoadingSpinner } from '@/components/VideoCard';
import { useRouter } from '@/lib/router';
import type { VideoObject } from '@/types/invidious';

export function SubscriptionsPage() {
  const { user } = useAuth();
  const { subscriptions, loading: subsLoading } = useSubscriptions();
  const { navigate } = useRouter();
  const [videos, setVideos] = useState<VideoObject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || subscriptions.length === 0) {
      setVideos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const allVideos: VideoObject[] = [];
    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const data = await invidious.getChannelVideos(sub.channel_id);
          allVideos.push(...(data.videos || []));
        } catch { /* ignore */ }
      })
    );
    allVideos.sort((a, b) => (b.published || 0) - (a.published || 0));
    setVideos(allVideos);
    setLoading(false);
  }, [user, subscriptions]);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-neutral-400">Sign in to see your subscriptions feed.</p>
        <button
          onClick={() => navigate({ name: 'signin' })}
          className="px-6 py-2 bg-neutral-200 text-neutral-900 rounded-full font-medium"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (subsLoading || loading) return <LoadingSpinner />;

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-neutral-400">You haven't subscribed to any channels yet.</p>
        <button
          onClick={() => navigate({ name: 'home' })}
          className="px-6 py-2 bg-neutral-200 text-neutral-900 rounded-full font-medium"
        >
          Browse trending
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-medium text-neutral-100 mb-4">Subscriptions</h1>
      {videos.length === 0 ? (
        <p className="text-neutral-500">No videos from your subscriptions.</p>
      ) : (
        <VideoGrid videos={videos} />
      )}
    </div>
  );
}
