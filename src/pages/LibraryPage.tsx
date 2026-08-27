import { useState, useEffect, useCallback } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { usePlaylists, useHistory, useLiked, useWatchLater, useSubscriptions } from '@/lib/hooks';
import { LoadingSpinner } from '@/components/VideoCard';
import { formatLength, getBestThumbnail } from '@/lib/format';
import { ListVideo, ThumbsUp, Clock, Trash2, Plus, Play } from 'lucide-react';
import type { PlaylistItemRow } from '@/lib/hooks';

export function LibraryPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const { playlists, loading: plLoading, createPlaylist, deletePlaylist, getPlaylistItems } = usePlaylists();
  const { history } = useHistory();
  const { liked } = useLiked();
  const { watchLater } = useWatchLater();
  const { subscriptions } = useSubscriptions();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItemRow[]>([]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-neutral-400">Sign in to see your library.</p>
        <button onClick={() => navigate({ name: 'signin' })} className="px-6 py-2 bg-neutral-200 text-neutral-900 rounded-full font-medium">
          Sign in
        </button>
      </div>
    );
  }

  if (plLoading) return <LoadingSpinner />;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createPlaylist(newName);
    setNewName('');
    setShowCreate(false);
  };

  const toggleExpand = async (playlistId: string) => {
    if (expandedPlaylist === playlistId) {
      setExpandedPlaylist(null);
      setPlaylistItems([]);
    } else {
      setExpandedPlaylist(playlistId);
      const items = await getPlaylistItems(playlistId);
      setPlaylistItems(items);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-8">
      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button onClick={() => navigate({ name: 'history' })} className="bg-neutral-800 rounded-lg p-4 hover:bg-neutral-700 text-left">
          <Clock size={24} className="text-neutral-400 mb-2" />
          <div className="text-sm text-neutral-200">History</div>
          <div className="text-xs text-neutral-500">{history.length} videos</div>
        </button>
        <button onClick={() => navigate({ name: 'liked' })} className="bg-neutral-800 rounded-lg p-4 hover:bg-neutral-700 text-left">
          <ThumbsUp size={24} className="text-neutral-400 mb-2" />
          <div className="text-sm text-neutral-200">Liked</div>
          <div className="text-xs text-neutral-500">{liked.length} videos</div>
        </button>
        <button onClick={() => navigate({ name: 'watchlater' })} className="bg-neutral-800 rounded-lg p-4 hover:bg-neutral-700 text-left">
          <Play size={24} className="text-neutral-400 mb-2" />
          <div className="text-sm text-neutral-200">Watch later</div>
          <div className="text-xs text-neutral-500">{watchLater.length} videos</div>
        </button>
        <button onClick={() => navigate({ name: 'subscriptions' })} className="bg-neutral-800 rounded-lg p-4 hover:bg-neutral-700 text-left">
          <ListVideo size={24} className="text-neutral-400 mb-2" />
          <div className="text-sm text-neutral-200">Subscriptions</div>
          <div className="text-xs text-neutral-500">{subscriptions.length} channels</div>
        </button>
      </div>

      {/* Playlists */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium text-neutral-100">My playlists</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 text-sm"
          >
            <Plus size={16} /> New playlist
          </button>
        </div>

        {showCreate && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Playlist name"
              className="flex-1 max-w-xs bg-neutral-800 text-neutral-200 text-sm px-3 py-1.5 rounded-lg border border-neutral-700"
            />
            <button onClick={handleCreate} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500">Create</button>
          </div>
        )}

        {playlists.length === 0 ? (
          <p className="text-neutral-500 text-sm">No playlists yet. Create one to get started.</p>
        ) : (
          <div className="space-y-2">
            {playlists.map((pl) => (
              <div key={pl.id}>
                <div className="flex items-center gap-3 bg-neutral-800 rounded-lg p-3 group">
                  <button onClick={() => toggleExpand(pl.id)} className="flex items-center gap-3 flex-1 text-left">
                    <ListVideo size={20} className="text-neutral-400" />
                    <div>
                      <div className="text-sm text-neutral-100">{pl.title}</div>
                      <div className="text-xs text-neutral-500">{pl.description || 'No description'}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => deletePlaylist(pl.id)}
                    className="p-2 text-neutral-500 hover:text-neutral-300 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {expandedPlaylist === pl.id && (
                  <div className="ml-6 mt-1 space-y-1">
                    {playlistItems.length === 0 ? (
                      <p className="text-neutral-500 text-xs p-2">No videos in this playlist.</p>
                    ) : (
                      playlistItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => navigate({ name: 'watch', videoId: item.video_id })}
                          className="w-full flex gap-2 p-1.5 rounded hover:bg-neutral-800 text-left text-xs"
                        >
                          {item.thumbnail && <img src={item.thumbnail} alt="" className="w-20 aspect-video rounded object-cover" />}
                          <div className="min-w-0">
                            <div className="text-neutral-200 line-clamp-2">{item.title}</div>
                            {item.author && <div className="text-neutral-500 mt-0.5">{item.author}</div>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
