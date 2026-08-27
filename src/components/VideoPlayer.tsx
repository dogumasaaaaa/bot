import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, SkipForward, Rewind, FastForward } from 'lucide-react';
import type { VideoDetails, Caption } from '@/types/invidious';
import { invidious } from '@/lib/invidious';

interface VideoPlayerProps {
  video: VideoDetails;
  autoplay?: boolean;
  onEnded?: () => void;
  captions?: Caption[];
  defaultQuality?: string;
}

export function VideoPlayer({ video, autoplay, onEnded, captions = [], defaultQuality = 'auto' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [activeCaption, setActiveCaption] = useState<Caption | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [qualities, setQualities] = useState<{ label: string; url: string }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [buffered, setBuffered] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine available streams
  useEffect(() => {
    const streams: { label: string; url: string }[] = [];
    if (video.formatStreams && video.formatStreams.length > 0) {
      for (const s of video.formatStreams) {
        if (s.url) streams.push({ label: s.qualityLabel || s.quality || 'unknown', url: s.url });
      }
    }
    if (video.adaptiveFormats && video.adaptiveFormats.length > 0 && streams.length === 0) {
      const videoStreams = video.adaptiveFormats.filter((f) => f.mimeType?.startsWith('video'));
      for (const s of videoStreams) {
        if (s.url) streams.push({ label: s.qualityLabel || s.resolution || 'unknown', url: s.url });
      }
    }
    setQualities(streams);

    if (streams.length > 0) {
      let chosen = streams[0];
      if (defaultQuality !== 'auto') {
        const match = streams.find((s) => s.label.includes(defaultQuality));
        if (match) chosen = match;
      }
      setCurrentQuality(chosen.label);
      if (videoRef.current) {
        videoRef.current.src = chosen.url;
        if (autoplay) videoRef.current.play().catch(() => {});
      }
    } else if (video.hlsUrl && videoRef.current) {
      // HLS via native (Safari) or fallback
      videoRef.current.src = video.hlsUrl;
      if (autoplay) videoRef.current.play().catch(() => {});
    }
  }, [video.videoId, video.formatStreams, video.adaptiveFormats, video.hlsUrl, autoplay, defaultQuality]);

  // Load caption track
  useEffect(() => {
    if (captions.length > 0 && !activeCaption) {
      setActiveCaption(captions[0]);
    }
  }, [captions, activeCaption]);

  // Fetch caption text when toggled
  useEffect(() => {
    if (!showCaptions || !activeCaption) {
      setCaptionText('');
      return;
    }
    let cancelled = false;
    invidious.getCaptions(video.videoId, activeCaption.label).then((text) => {
      if (!cancelled) setCaptionText(text);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [showCaptions, activeCaption, video.videoId]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const seek = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = time;
    setCurrentTime(time);
  }, []);

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  const changeQuality = useCallback((label: string) => {
    const stream = qualities.find((s) => s.label === label);
    if (!stream || !videoRef.current) return;
    const v = videoRef.current;
    const wasPlaying = !v.paused;
    const time = v.currentTime;
    v.src = stream.url;
    v.currentTime = time;
    if (wasPlaying) v.play().catch(() => {});
    setCurrentQuality(label);
    setShowSettings(false);
  }, [qualities]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onDurationChange = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEndedHandler = () => { setPlaying(false); onEnded?.(); };
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1));
      }
    };

    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('durationchange', onDurationChange);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onEndedHandler);
    v.addEventListener('progress', onProgress);

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('durationchange', onDurationChange);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onEndedHandler);
      v.removeEventListener('progress', onProgress);
    };
  }, [onEnded]);

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        onClick={togglePlay}
        playsInline
      />

      {showCaptions && captionText && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded text-sm max-w-[80%] text-center pointer-events-none">
          {captionText.split('\n').slice(0, 2).join(' ')}
        </div>
      )}

      {showControls && (
        <>
          {/* Center play/pause overlay */}
          {!playing && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center">
                <Play size={32} className="text-white ml-1" fill="white" />
              </div>
            </button>
          )}

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-2 px-3">
            {/* Progress bar */}
            <div
              className="relative h-1 bg-neutral-600 rounded-full mb-2 cursor-pointer group/bar"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                seek(pct * duration);
              }}
            >
              <div className="absolute h-full bg-neutral-500 rounded-full" style={{ width: `${bufferedPct}%` }} />
              <div className="absolute h-full bg-red-600 rounded-full" style={{ width: `${progress}%` }} />
              <div
                className="absolute h-3 w-3 bg-red-600 rounded-full -top-1 opacity-0 group-hover/bar:opacity-100"
                style={{ left: `calc(${progress}% - 6px)` }}
              />
            </div>

            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="text-white p-1 hover:bg-white/10 rounded">
                {playing ? <Pause size={20} /> : <Play size={20} fill="white" />}
              </button>
              <button onClick={() => skip(-10)} className="text-white p-1 hover:bg-white/10 rounded">
                <Rewind size={20} />
              </button>
              <button onClick={() => skip(10)} className="text-white p-1 hover:bg-white/10 rounded">
                <FastForward size={20} />
              </button>
              <button onClick={toggleMute} className="text-white p-1 hover:bg-white/10 rounded">
                {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    videoRef.current.muted = val === 0;
                    setMuted(val === 0);
                  }
                }}
                className="w-20 accent-white"
              />
              <span className="text-white text-xs">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="flex-1" />
              {onEnded && (
                <button onClick={onEnded} className="text-white p-1 hover:bg-white/10 rounded" title="Next">
                  <SkipForward size={20} />
                </button>
              )}
              {captions.length > 0 && (
                <button
                  onClick={() => setShowCaptions(!showCaptions)}
                  className={`text-white p-1 hover:bg-white/10 rounded text-xs font-bold ${showCaptions ? 'border border-white' : ''}`}
                  title="Captions"
                >
                  CC
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-white p-1 hover:bg-white/10 rounded"
                >
                  <Settings size={20} />
                </button>
                {showSettings && (
                  <div className="absolute bottom-8 right-0 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-2 min-w-40">
                    <div className="px-3 py-1 text-xs text-neutral-400 uppercase">Quality</div>
                    {qualities.map((q) => (
                      <button
                        key={q.label}
                        onClick={() => changeQuality(q.label)}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-700 ${currentQuality === q.label ? 'text-blue-400' : 'text-neutral-200'}`}
                      >
                        {q.label}
                      </button>
                    ))}
                    {captions.length > 0 && (
                      <>
                        <hr className="my-1 border-neutral-700" />
                        <div className="px-3 py-1 text-xs text-neutral-400 uppercase">Captions</div>
                        <button
                          onClick={() => setShowCaptions(!showCaptions)}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-700 ${showCaptions ? 'text-blue-400' : 'text-neutral-200'}`}
                        >
                          {showCaptions ? 'On' : 'Off'}
                        </button>
                        {captions.map((c) => (
                          <button
                            key={c.languageCode}
                            onClick={() => setActiveCaption(c)}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-700 ${activeCaption?.languageCode === c.languageCode ? 'text-blue-400' : 'text-neutral-200'}`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              <button onClick={toggleFullscreen} className="text-white p-1 hover:bg-white/10 rounded">
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
