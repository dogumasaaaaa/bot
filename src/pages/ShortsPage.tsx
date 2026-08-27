import { useState, useEffect, useCallback, useRef } from 'react';
import { invidious } from '@/lib/invidious';
import { useRouter } from '@/lib/router';
import { LoadingSpinner, ErrorMessage } from '@/components/VideoCard';
import { formatViewCount, formatPublishedText, getBestThumbnail } from '@/lib/format';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import type { VideoObject } from '@/types/invidious';

export function ShortsPage() {
  const { navigate } = useRouter();
  const [shorts, setShorts] = useState<VideoObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invidious.getPopular();
      const filtered = data.filter((v) => v.lengthSeconds && v.lengthSeconds <= 60);
      setShorts(filtered.length > 0 ? filtered : data.slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shorts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const scrollNext = () => {
    if (currentIndex < shorts.length - 1) setCurrentIndex(currentIndex + 1);
  };
  const scrollPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (shorts.length === 0) return <ErrorMessage message="No shorts found" />;

  const current = shorts[currentIndex];

  return (
    <div className="flex justify-center py-4">
      <div className="relative w-full max-w-md aspect-[9/16] bg-black rounded-lg overflow-hidden">
        <ShortPlayer key={current.videoId} video={current} onNext={scrollNext} />

        {/* Navigation arrows */}
        <div className="absolute right-2 bottom-20 flex flex-col gap-2">
          <button
            onClick={scrollPrev}
            disabled={currentIndex === 0}
            className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white disabled:opacity-30"
          >
            ↑
          </button>
          <button
            onClick={scrollNext}
            disabled={currentIndex >= shorts.length - 1}
            className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white disabled:opacity-30"
          >
            ↓
          </button>
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-12 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={() => navigate({ name: 'channel', channelId: current.authorId })}
            className="text-white text-sm font-medium block mb-1"
          >
            {current.author}
          </button>
          <p className="text-white text-sm line-clamp-2">{current.title}</p>
          <p className="text-white/60 text-xs mt-1">{formatViewCount(current.viewCount)}</p>
        </div>
      </div>
    </div>
  );
}

function ShortPlayer({ video, onNext }: { video: VideoObject; onNext: () => void }) {
  const { navigate } = useRouter();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPlaying(false);
    setStreamUrl(null);
    invidious.getVideo(video.videoId).then((data) => {
      if (cancelled) return;
      if (data.formatStreams && data.formatStreams.length > 0) {
        setStreamUrl(data.formatStreams[0].url);
      } else if (data.adaptiveFormats && data.adaptiveFormats.length > 0) {
        const videoStream = data.adaptiveFormats.find((f) => f.mimeType?.startsWith('video') && f.url);
        setStreamUrl(videoStream?.url || null);
      } else if (data.hlsUrl) {
        setStreamUrl(data.hlsUrl);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [video.videoId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && streamUrl && videoRef.current) {
          videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
        } else if (videoRef.current) {
          videoRef.current.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.5 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [streamUrl]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full" onClick={togglePlay}>
      {streamUrl ? (
        <video
          ref={videoRef}
          src={streamUrl}
          className="w-full h-full object-contain"
          loop
          muted={muted}
          playsInline
          onEnded={onNext}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {getBestThumbnail(video.videoThumbnails) && (
            <img src={getBestThumbnail(video.videoThumbnails)} alt="" className="w-full h-full object-contain" />
          )}
        </div>
      )}

      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center">
            <Play size={32} className="text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
        className="absolute top-2 right-2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white"
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
    </div>
  );
}


