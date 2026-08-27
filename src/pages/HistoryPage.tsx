import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useHistory } from '@/lib/hooks';
import { LoadingSpinner } from '@/components/VideoCard';
import { formatLength, formatPublishedDate } from '@/lib/format';
import { Trash2, Clock } from 'lucide-react';

export function HistoryPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const { history, loading, removeFromHistory, clearHistory } = useHistory();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-neutral-400">Sign in to see your watch history.</p>
        <button onClick={() => navigate({ name: 'signin' })} className="px-6 py-2 bg-neutral-200 text-neutral-900 rounded-full font-medium">
          Sign in
        </button>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-medium text-neutral-100">Watch history</h1>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 text-sm"
          >
            <Trash2 size={16} /> Clear all
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <Clock size={48} className="text-neutral-600" />
          <p className="text-neutral-500">No videos watched yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <div key={item.id} className="flex gap-3 group">
              <button
                onClick={() => navigate({ name: 'watch', videoId: item.video_id })}
                className="flex gap-3 flex-1 text-left p-1 rounded-lg hover:bg-neutral-800"
              >
                <div className="relative w-40 aspect-video bg-neutral-800 rounded-lg overflow-hidden shrink-0">
                  {item.thumbnail && <img src={item.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />}
                  {item.length_seconds && (
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                      {formatLength(item.length_seconds)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-neutral-100 line-clamp-2">{item.title}</h3>
                  {item.author && (
                    <p className="text-xs text-neutral-500 mt-1">{item.author}</p>
                  )}
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {new Date(item.watched_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
              <button
                onClick={() => removeFromHistory(item.video_id)}
                className="p-2 text-neutral-500 hover:text-neutral-300 opacity-0 group-hover:opacity-100"
                title="Remove from history"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
