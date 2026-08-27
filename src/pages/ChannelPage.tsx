import { useState, useEffect, useCallback } from 'react';
import { Search, Bell } from 'lucide-react';
import { invidious } from '@/lib/invidious';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useSubscriptions } from '@/lib/hooks';
import { VideoGrid, PlaylistCard, LoadingSpinner, ErrorMessage, VideoCardCompact } from '@/components/VideoCard';
import { formatSubCount, formatCount, formatJoinedDate, getBestThumbnail } from '@/lib/format';
import type { ChannelDetails, VideoObject, PlaylistObject, CommunityPost } from '@/types/invidious';

type Tab = 'videos' | 'shorts' | 'streams' | 'playlists' | 'community' | 'about';

export function ChannelPage({ channelId }: { channelId: string }) {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const { isSubscribed, subscribe, unsubscribe } = useSubscriptions();

  const [channel, setChannel] = useState<ChannelDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('videos');
  const [videos, setVideos] = useState<VideoObject[]>([]);
  const [continuation, setContinuation] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistObject[]>([]);
  const [community, setCommunity] = useState<CommunityPost[]>([]);
  const [channelSearch, setChannelSearch] = useState('');
  const [searchResults, setSearchResults] = useState<VideoObject[]>([]);
  const [searching, setSearching] = useState(false);

  const loadChannel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invidious.getChannel(channelId);
      setChannel(data);
      setVideos(data.latestVideos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channel');
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => { loadChannel(); }, [loadChannel]);

  const loadMoreVideos = async () => {
    if (!continuation || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await invidious.getChannelVideos(channelId, continuation);
      setVideos((prev) => [...prev, ...data.videos]);
      setContinuation(data.continuation);
    } catch {
      setContinuation(undefined);
    } finally {
      setLoadingMore(false);
    }
  };

  const switchTab = async (newTab: Tab) => {
    setTab(newTab);
    if (newTab === 'playlists' && playlists.length === 0) {
      try {
        const data = await invidious.getChannelPlaylists(channelId);
        setPlaylists(data.playlists || []);
      } catch { /* ignore */ }
    }
    if (newTab === 'community' && community.length === 0) {
      try {
        const data = await invidious.getChannelCommunity(channelId);
        setCommunity(data.comments || []);
      } catch { /* ignore */ }
    }
  };

  const doChannelSearch = async () => {
    if (!channelSearch.trim()) return;
    setSearching(true);
    try {
      const data = await invidious.getChannelSearch(channelId, channelSearch);
      setSearchResults(data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadChannel} />;
  if (!channel) return <ErrorMessage message="Channel not found" />;

  const subbed = user && isSubscribed(channelId);
  const banner = channel.authorBanners?.[0]?.url;
  const avatar = channel.authorThumbnails?.[0]?.url;

  const handleSubscribe = () => {
    if (!user) { navigate({ name: 'signin' }); return; }
    if (subbed) {
      unsubscribe(channelId);
    } else {
      subscribe(channelId, channel.author, avatar || null);
    }
  };

  return (
    <div>
      {/* Banner */}
      {banner && (
        <div className="w-full h-32 bg-neutral-800 overflow-hidden">
          <img src={banner} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Channel header */}
      <div className="flex items-center gap-4 p-4 max-w-6xl mx-auto">
        {avatar ? (
          <img src={avatar} alt={channel.author} className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-neutral-700" />
        )}
        <div className="flex-1">
          <h1 className="text-xl font-medium text-neutral-100">{channel.author}</h1>
          {channel.authorVerified && <span className="text-xs text-neutral-500">Verified</span>}
          <p className="text-sm text-neutral-400">{formatSubCount(channel.subCount)}</p>
          <p className="text-sm text-neutral-500">{formatCount(channel.totalViews)} views</p>
          {channel.pronouns && <p className="text-sm text-neutral-500">{channel.pronouns}</p>}
        </div>
        <button
          onClick={handleSubscribe}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium ${subbed ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-200 text-neutral-900'}`}
        >
          {subbed && <Bell size={16} />}
          {subbed ? 'Subscribed' : 'Subscribe'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-800 px-4 max-w-6xl mx-auto">
        <div className="flex gap-6">
          {(['videos', 'shorts', 'streams', 'playlists', 'community', 'about'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`pb-3 pt-1 text-sm capitalize border-b-2 ${tab === t ? 'border-neutral-100 text-neutral-100' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Channel search */}
      {tab === 'videos' && (
        <div className="flex gap-2 p-4 max-w-6xl mx-auto">
          <input
            type="text"
            value={channelSearch}
            onChange={(e) => setChannelSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doChannelSearch()}
            placeholder="Search this channel"
            className="flex-1 max-w-xs bg-neutral-800 text-neutral-200 text-sm px-3 py-1.5 rounded-lg border border-neutral-700"
          />
          <button onClick={doChannelSearch} className="p-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700">
            <Search size={18} />
          </button>
        </div>
      )}

      <div className="p-4 max-w-6xl mx-auto">
        {/* Search results override */}
        {channelSearch && searchResults.length > 0 ? (
          <VideoGrid videos={searchResults} />
        ) : channelSearch && searching ? (
          <LoadingSpinner />
        ) : (
          <>
            {tab === 'videos' && (
              <>
                <VideoGrid videos={videos} />
                {continuation && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={loadMoreVideos}
                      disabled={loadingMore}
                      className="px-6 py-2 bg-neutral-800 text-neutral-200 rounded-lg hover:bg-neutral-700"
                    >
                      {loadingMore ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}

            {tab === 'shorts' && (
              <ShortsTab channelId={channelId} />
            )}

            {tab === 'streams' && (
              <StreamsTab channelId={channelId} />
            )}

            {tab === 'playlists' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {playlists.map((p) => (
                  <PlaylistCard key={p.playlistId} playlist={p} />
                ))}
                {playlists.length === 0 && <p className="text-neutral-500">No playlists found.</p>}
              </div>
            )}

            {tab === 'community' && (
              <div className="max-w-2xl space-y-4">
                {community.map((post) => (
                  <div key={post.commentId} className="bg-neutral-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {post.authorThumbnails?.[0]?.url ? (
                        <img src={post.authorThumbnails[0].url} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-700" />
                      )}
                      <span className="text-sm font-medium text-neutral-200">{post.author}</span>
                      <span className="text-xs text-neutral-500">{post.publishedText}</span>
                    </div>
                    <p className="text-sm text-neutral-300 whitespace-pre-wrap">{post.content}</p>
                    <div className="text-xs text-neutral-500 mt-2">{formatCount(post.likeCount)} likes</div>
                  </div>
                ))}
                {community.length === 0 && <p className="text-neutral-500">No community posts.</p>}
              </div>
            )}

            {tab === 'about' && (
              <div className="max-w-2xl space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-200 mb-1">Description</h3>
                  <p className="text-sm text-neutral-400 whitespace-pre-wrap">{channel.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-200">Joined</h3>
                    <p className="text-sm text-neutral-400">{formatJoinedDate(channel.joined)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-neutral-200">Total views</h3>
                    <p className="text-sm text-neutral-400">{formatCount(channel.totalViews)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-neutral-200">Subscribers</h3>
                    <p className="text-sm text-neutral-400">{formatSubCount(channel.subCount)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-neutral-200">Family friendly</h3>
                    <p className="text-sm text-neutral-400">{channel.isFamilyFriendly ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                {channel.relatedChannels && channel.relatedChannels.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-200 mb-2">Related channels</h3>
                    <div className="flex flex-wrap gap-4">
                      {channel.relatedChannels.map((rc) => (
                        <button
                          key={rc.authorId}
                          onClick={() => navigate({ name: 'channel', channelId: rc.authorId })}
                          className="flex flex-col items-center gap-1"
                        >
                          {rc.authorThumbnails?.[0]?.url ? (
                            <img src={rc.authorThumbnails[0].url} alt="" className="w-12 h-12 rounded-full" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-neutral-700" />
                          )}
                          <span className="text-xs text-neutral-400">{rc.author}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ShortsTab({ channelId }: { channelId: string }) {
  const [shorts, setShorts] = useState<VideoObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [continuation, setContinuation] = useState<string | undefined>();

  useEffect(() => {
    invidious.getChannelShorts(channelId).then((data) => {
      setShorts(data.videos || []);
      setContinuation(data.continuation);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [channelId]);

  const loadMore = async () => {
    if (!continuation) return;
    const data = await invidious.getChannelShorts(channelId, continuation);
    setShorts((prev) => [...prev, ...data.videos]);
    setContinuation(data.continuation);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {shorts.map((s) => (
          <VideoCardCompact key={s.videoId} video={s} />
        ))}
      </div>
      {continuation && (
        <div className="flex justify-center mt-4">
          <button onClick={loadMore} className="px-4 py-2 bg-neutral-800 text-neutral-200 rounded-lg hover:bg-neutral-700 text-sm">
            Load more
          </button>
        </div>
      )}
    </>
  );
}

function StreamsTab({ channelId }: { channelId: string }) {
  const [streams, setStreams] = useState<VideoObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [continuation, setContinuation] = useState<string | undefined>();

  useEffect(() => {
    invidious.getChannelStreams(channelId).then((data) => {
      setStreams(data.videos || []);
      setContinuation(data.continuation);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [channelId]);

  const loadMore = async () => {
    if (!continuation) return;
    const data = await invidious.getChannelStreams(channelId, continuation);
    setStreams((prev) => [...prev, ...data.videos]);
    setContinuation(data.continuation);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <VideoGrid videos={streams} />
      {continuation && (
        <div className="flex justify-center mt-4">
          <button onClick={loadMore} className="px-4 py-2 bg-neutral-800 text-neutral-200 rounded-lg hover:bg-neutral-700 text-sm">
            Load more
          </button>
        </div>
      )}
    </>
  );
}
