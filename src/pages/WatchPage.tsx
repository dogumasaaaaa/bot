import { useState, useEffect, useCallback, useRef } from 'react';
import { ThumbsUp, Clock, ListPlus, Share2, ChevronDown, ChevronUp, ArrowLeft, ArrowRight } from 'lucide-react';
import { invidious } from '@/lib/invidious';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useHistory, useLiked, useWatchLater, usePlaylists, usePreferences } from '@/lib/hooks';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoCardCompact, LoadingSpinner, ErrorMessage } from '@/components/VideoCard';
import { formatViewCount, formatCount, formatLength, getBestThumbnail, timeAgo } from '@/lib/format';
import type { VideoDetails, Comment, CommentsResponse, RecommendedVideo, VideoObject, PlaylistDetails } from '@/types/invidious';

export function WatchPage({ videoId, list }: { videoId: string; list?: string }) {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const { addToHistory } = useHistory();
  const { isLiked, toggleLike } = useLiked();
  const { isInWatchLater, toggleWatchLater } = useWatchLater();
  const { playlists, createPlaylist, addToPlaylist } = usePlaylists();
  const { prefs } = usePreferences();

  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContinuation, setCommentContinuation] = useState<string | undefined>();
  const [loadingComments, setLoadingComments] = useState(false);
  const [playlistData, setPlaylistData] = useState<PlaylistDetails | null>(null);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [mixVideos, setMixVideos] = useState<VideoObject[]>([]);
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(true);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const loadVideo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invidious.getVideo(videoId);
      setVideo(data);
      if (user) {
        addToHistory({
          video_id: data.videoId,
          title: data.title,
          author: data.author,
          author_id: data.authorId,
          thumbnail: getBestThumbnail(data.videoThumbnails),
          length_seconds: data.lengthSeconds,
        });
      }
      // Load comments
      try {
        const c = await invidious.getComments(videoId);
        setComments(c.comments || []);
        setCommentContinuation(c.continuation);
      } catch {
        setComments([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setLoading(false);
    }
  }, [videoId, user, addToHistory]);

  useEffect(() => { loadVideo(); }, [loadVideo]);

  // Load playlist or mix
  useEffect(() => {
    if (list) {
      if (list.startsWith('RD')) {
        // Mix
        invidious.getMix(list).then((data) => {
          setMixVideos(data.videos || []);
          setPlaylistData(null);
          const idx = data.videos.findIndex((v) => v.videoId === videoId);
          setPlaylistIndex(idx >= 0 ? idx : 0);
        }).catch(() => setMixVideos([]));
      } else {
        invidious.getPlaylist(list).then((data) => {
          setPlaylistData(data);
          setMixVideos([]);
          const idx = data.videos.findIndex((v) => v.videoId === videoId);
          setPlaylistIndex(idx >= 0 ? idx : 0);
        }).catch(() => setPlaylistData(null));
      }
    } else {
      setPlaylistData(null);
      setMixVideos([]);
    }
  }, [list, videoId]);

  const loadMoreComments = async () => {
    if (!commentContinuation) return;
    setLoadingComments(true);
    try {
      const c: CommentsResponse = await invidious.getComments(videoId, commentContinuation);
      setComments((prev) => [...prev, ...(c.comments || [])]);
      setCommentContinuation(c.continuation);
    } catch {
      setCommentContinuation(undefined);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleEnded = useCallback(() => {
    if (prefs?.autoplay === false) return;
    // If in playlist, go to next
    if (playlistData && playlistIndex < playlistData.videos.length - 1) {
      const next = playlistData.videos[playlistIndex + 1];
      navigate({ name: 'watch', videoId: next.videoId, list });
      return;
    }
    if (mixVideos.length > 0) {
      const currentIdx = mixVideos.findIndex((v) => v.videoId === videoId);
      if (currentIdx >= 0 && currentIdx < mixVideos.length - 1) {
        const next = mixVideos[currentIdx + 1];
        navigate({ name: 'watch', videoId: next.videoId, list });
        return;
      }
    }
    // Autoplay from recommended
    if (video?.recommendedVideos && video.recommendedVideos.length > 0) {
      navigate({ name: 'watch', videoId: video.recommendedVideos[0].videoId });
    }
  }, [playlistData, playlistIndex, mixVideos, videoId, video, navigate, list, prefs]);

  const playlistVideos: { videoId: string; title: string; author?: string }[] = playlistData?.videos || mixVideos;

  const goNextInPlaylist = () => {
    if (playlistIndex < playlistVideos.length - 1) {
      navigate({ name: 'watch', videoId: playlistVideos[playlistIndex + 1].videoId, list });
    }
  };

  const goPrevInPlaylist = () => {
    if (playlistIndex > 0) {
      navigate({ name: 'watch', videoId: playlistVideos[playlistIndex - 1].videoId, list });
    }
  };

  if (loading) return <div className="p-4"><LoadingSpinner /></div>;
  if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={loadVideo} /></div>;
  if (!video) return <div className="p-4"><ErrorMessage message="Video not found" /></div>;

  const liked = user && isLiked(videoId);
  const inWatchLater = user && isInWatchLater(videoId);

  const handleLike = () => {
    if (!user) { navigate({ name: 'signin' }); return; }
    toggleLike({
      video_id: video.videoId,
      title: video.title,
      author: video.author,
      author_id: video.authorId,
      thumbnail: getBestThumbnail(video.videoThumbnails),
      length_seconds: video.lengthSeconds,
    });
  };

  const handleWatchLater = () => {
    if (!user) { navigate({ name: 'signin' }); return; }
    toggleWatchLater({
      video_id: video.videoId,
      title: video.title,
      author: video.author,
      author_id: video.authorId,
      thumbnail: getBestThumbnail(video.videoThumbnails),
      length_seconds: video.lengthSeconds,
    });
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    await addToPlaylist(playlistId, {
      video_id: video.videoId,
      title: video.title,
      author: video.author,
      author_id: video.authorId,
      thumbnail: getBestThumbnail(video.videoThumbnails),
      length_seconds: video.lengthSeconds,
    });
    setShowAddToPlaylist(false);
  };

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName.trim()) return;
    const pl = await createPlaylist(newPlaylistName);
    if (pl) {
      await handleAddToPlaylist(pl.id);
      setNewPlaylistName('');
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/#/watch/${video.videoId}`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <div className="p-4 max-w-[1800px] mx-auto flex gap-6">
      {/* Main column */}
      <div className="flex-1 min-w-0">
        <VideoPlayer
          video={video}
          autoplay={prefs?.autoplay !== false}
          onEnded={handleEnded}
          captions={video.captions || []}
          defaultQuality={prefs?.default_quality || 'auto'}
        />

        {/* Playlist bar */}
        {playlistVideos.length > 0 && (
          <div className="mt-2 bg-neutral-800 rounded-lg p-3 flex items-center gap-3">
            <button
              onClick={() => setShowPlaylistPanel(!showPlaylistPanel)}
              className="text-neutral-300 text-sm font-medium flex-1 text-left truncate"
            >
              {playlistData?.title || 'Mix'} - {playlistIndex + 1}/{playlistVideos.length}
            </button>
            <button onClick={goPrevInPlaylist} disabled={playlistIndex === 0} className="p-1 text-neutral-300 disabled:opacity-30">
              <ArrowLeft size={18} />
            </button>
            <button onClick={goNextInPlaylist} disabled={playlistIndex >= playlistVideos.length - 1} className="p-1 text-neutral-300 disabled:opacity-30">
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Title */}
        <h1 className="text-lg font-medium text-neutral-100 mt-3">{video.title}</h1>

        {/* Channel + actions */}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <button
            onClick={() => navigate({ name: 'channel', channelId: video.authorId })}
            className="flex items-center gap-2"
          >
            {video.authorThumbnails?.[0]?.url ? (
              <img src={video.authorThumbnails[0].url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-neutral-700" />
            )}
            <div className="text-left">
              <div className="text-sm font-medium text-neutral-100">{video.author}</div>
              <div className="text-xs text-neutral-500">{video.subCountText}</div>
            </div>
          </button>

          <button
            onClick={() => { if (!user) { navigate({ name: 'signin' }); return; } setSubscribed(!subscribed); }}
            className={`px-4 py-2 rounded-full text-sm font-medium ${subscribed ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-200 text-neutral-900'}`}
          >
            {subscribed ? 'Subscribed' : 'Subscribe'}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm ${liked ? 'bg-neutral-700 text-neutral-100' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
            >
              <ThumbsUp size={18} className={liked ? 'fill-current' : ''} />
              {formatCount(video.likeCount)}
            </button>
            <button
              onClick={handleWatchLater}
              className={`p-2 rounded-full ${inWatchLater ? 'bg-neutral-700 text-neutral-100' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
              title="Watch later"
            >
              <Clock size={18} />
            </button>
            <button
              onClick={() => setShowAddToPlaylist(!showAddToPlaylist)}
              className="p-2 rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              title="Save to playlist"
            >
              <ListPlus size={18} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              title="Copy link"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Add to playlist dropdown */}
        {showAddToPlaylist && (
          <div className="mt-2 bg-neutral-800 border border-neutral-700 rounded-lg p-3 max-w-sm">
            <div className="text-sm text-neutral-300 mb-2">Save to playlist</div>
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAddToPlaylist(pl.id)}
                className="w-full text-left px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700 rounded"
              >
                {pl.title}
              </button>
            ))}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name"
                className="flex-1 bg-neutral-700 text-neutral-200 text-sm px-3 py-1.5 rounded border border-neutral-600"
              />
              <button
                onClick={handleCreateAndAdd}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-500"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mt-3 bg-neutral-800 rounded-lg p-3">
          <div className="text-sm text-neutral-300">
            {formatViewCount(video.viewCount)}
            {video.publishedText ? ` - ${video.publishedText}` : ''}
          </div>
          <div className={`text-sm text-neutral-200 mt-2 whitespace-pre-wrap ${descExpanded ? '' : 'line-clamp-3'}`}>
            {video.description || 'No description available.'}
          </div>
          {video.description && video.description.length > 200 && (
            <button
              onClick={() => setDescExpanded(!descExpanded)}
              className="text-sm text-neutral-400 mt-1 flex items-center gap-1"
            >
              {descExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {descExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {/* Comments */}
        <div className="mt-6">
          <h3 className="text-base font-medium text-neutral-100 mb-3">
            {comments.length > 0 ? `${comments.length} Comments` : 'Comments'}
          </h3>
          {comments.length === 0 && !loadingComments && (
            <p className="text-neutral-500 text-sm">No comments or comments failed to load.</p>
          )}
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.commentId} className="flex gap-3">
                {c.authorThumbnails?.[0]?.url ? (
                  <img src={c.authorThumbnails[0].url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-700 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-200">{c.author}</span>
                    {c.isPinned && <span className="text-xs text-neutral-500">Pinned</span>}
                    {c.authorIsChannelOwner && <span className="text-xs bg-neutral-700 text-neutral-300 px-1 rounded">Creator</span>}
                    <span className="text-xs text-neutral-500">{c.publishedText}</span>
                  </div>
                  <p className="text-sm text-neutral-300 mt-1 whitespace-pre-wrap">{c.content}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <ThumbsUp size={12} /> {formatCount(c.likeCount)}
                    </span>
                    {c.replyCount && c.replyCount > 0 && (
                      <span className="text-xs text-neutral-500">{c.replyCount} replies</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {commentContinuation && (
            <button
              onClick={loadMoreComments}
              disabled={loadingComments}
              className="mt-4 px-4 py-2 bg-neutral-800 text-neutral-200 rounded-lg hover:bg-neutral-700 text-sm"
            >
              {loadingComments ? 'Loading...' : 'Load more comments'}
            </button>
          )}
        </div>
      </div>

      {/* Sidebar: playlist queue + related */}
      <div className="w-80 shrink-0 hidden lg:block">
        {showPlaylistPanel && playlistVideos.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-neutral-100 mb-2">
              {playlistData?.title || 'Mix'}
            </h3>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {playlistVideos.map((v, i) => (
                <button
                  key={v.videoId + i}
                  onClick={() => navigate({ name: 'watch', videoId: v.videoId, list })}
                  className={`w-full flex gap-2 p-1.5 rounded text-left text-xs ${v.videoId === videoId ? 'bg-neutral-800' : 'hover:bg-neutral-800'}`}
                >
                  <span className="text-neutral-500 w-4 shrink-0">{i + 1}</span>
                  {getBestThumbnail((v as VideoObject).videoThumbnails) && (
                    <img src={getBestThumbnail((v as VideoObject).videoThumbnails)} alt="" className="w-20 aspect-video rounded object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-neutral-200 line-clamp-2">{v.title}</div>
                    {'author' in v && v.author && <div className="text-neutral-500 mt-0.5">{v.author}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <h3 className="text-sm font-medium text-neutral-100 mb-2">Up next</h3>
        <div className="space-y-3">
          {video.recommendedVideos?.map((rv: RecommendedVideo) => (
            <VideoCardCompact
              key={rv.videoId}
              video={{
                type: 'video',
                title: rv.title,
                videoId: rv.videoId,
                author: rv.author,
                authorId: rv.authorId,
                authorUrl: '',
                videoThumbnails: rv.videoThumbnails,
                viewCount: rv.viewCount,
                lengthSeconds: rv.lengthSeconds,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
