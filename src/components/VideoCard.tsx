import { useRouter } from '@/lib/router';
import { formatLength, formatViewCount, formatPublishedText, getBestThumbnail } from '@/lib/format';
import type { VideoObject } from '@/types/invidious';

export function VideoCard({ video }: { video: VideoObject }) {
  const { navigate } = useRouter();
  const thumb = getBestThumbnail(video.videoThumbnails);

  return (
    <div className="cursor-pointer" onClick={() => navigate({ name: 'watch', videoId: video.videoId })}>
      <div className="relative aspect-video bg-neutral-800 rounded-lg overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full" />
        )}
        {video.lengthSeconds && video.lengthSeconds > 0 && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
            {formatLength(video.lengthSeconds)}
          </span>
        )}
        {video.liveNow && (
          <span className="absolute bottom-1 right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded font-medium">
            LIVE
          </span>
        )}
      </div>
      <div className="flex gap-3 mt-3">
        <button
          onClick={(e) => { e.stopPropagation(); navigate({ name: 'channel', channelId: video.authorId }); }}
          className="shrink-0"
        >
          <div className="w-9 h-9 rounded-full bg-neutral-700" />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-neutral-100 line-clamp-2">{video.title}</h3>
          <button
            onClick={(e) => { e.stopPropagation(); navigate({ name: 'channel', channelId: video.authorId }); }}
            className="text-xs text-neutral-400 mt-1 hover:text-neutral-200 block truncate"
          >
            {video.author}
          </button>
          <p className="text-xs text-neutral-500">
            {formatViewCount(video.viewCount)}
            {video.publishedText ? ` - ${formatPublishedText(video.publishedText)}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

export function VideoCardCompact({ video }: { video: VideoObject }) {
  const { navigate } = useRouter();
  const thumb = getBestThumbnail(video.videoThumbnails);

  return (
    <div
      className="flex gap-2 cursor-pointer"
      onClick={() => navigate({ name: 'watch', videoId: video.videoId })}
    >
      <div className="relative w-40 aspect-video bg-neutral-800 rounded-lg overflow-hidden shrink-0">
        {thumb && <img src={thumb} alt={video.title} className="w-full h-full object-cover" loading="lazy" />}
        {video.lengthSeconds && video.lengthSeconds > 0 && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
            {formatLength(video.lengthSeconds)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-neutral-100 line-clamp-2">{video.title}</h3>
        <p className="text-xs text-neutral-400 mt-1 truncate">{video.author}</p>
        <p className="text-xs text-neutral-500">
          {formatViewCount(video.viewCount)}
          {video.publishedText ? ` - ${formatPublishedText(video.publishedText)}` : ''}
        </p>
      </div>
    </div>
  );
}

export function ChannelCard({ channel }: { channel: { authorId: string; author: string; authorThumbnails: { url: string }[]; subCount?: number; videoCount?: number } }) {
  const { navigate } = useRouter();
  const thumb = channel.authorThumbnails?.[0]?.url;

  return (
    <div
      className="flex flex-col items-center gap-2 cursor-pointer p-4 rounded-lg hover:bg-neutral-800"
      onClick={() => navigate({ name: 'channel', channelId: channel.authorId })}
    >
      {thumb ? (
        <img src={thumb} alt={channel.author} className="w-24 h-24 rounded-full object-cover" loading="lazy" />
      ) : (
        <div className="w-24 h-24 rounded-full bg-neutral-700" />
      )}
      <h3 className="text-sm font-medium text-neutral-100 text-center">{channel.author}</h3>
      {channel.subCount !== undefined && (
        <p className="text-xs text-neutral-500">{channel.subCount >= 1000 ? `${(channel.subCount / 1000).toFixed(1)}K` : channel.subCount} subscribers</p>
      )}
    </div>
  );
}

export function PlaylistCard({ playlist }: { playlist: { playlistId: string; title: string; playlistThumbnail?: string; author: string; videoCount?: number } }) {
  const { navigate } = useRouter();

  return (
    <div
      className="cursor-pointer"
      onClick={() => navigate({ name: 'playlist', playlistId: playlist.playlistId })}
    >
      <div className="relative aspect-video bg-neutral-800 rounded-lg overflow-hidden">
        {playlist.playlistThumbnail && (
          <img src={playlist.playlistThumbnail} alt={playlist.title} className="w-full h-full object-cover" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{playlist.videoCount || 0}</div>
            <div className="text-xs text-white/80">videos</div>
          </div>
        </div>
      </div>
      <h3 className="text-sm font-medium text-neutral-100 mt-2 line-clamp-2">{playlist.title}</h3>
      <p className="text-xs text-neutral-500 mt-1">{playlist.author}</p>
    </div>
  );
}

export function VideoGrid({ videos }: { videos: VideoObject[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos.map((v) => (
        <VideoCard key={v.videoId} video={v} />
      ))}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-neutral-600 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-neutral-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-neutral-800 text-neutral-200 rounded-lg hover:bg-neutral-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}
