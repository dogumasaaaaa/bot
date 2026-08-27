import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export interface SubscriptionRow {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_thumbnail: string | null;
  created_at: string;
}

export interface HistoryRow {
  id: string;
  video_id: string;
  title: string;
  author: string | null;
  author_id: string | null;
  thumbnail: string | null;
  length_seconds: number | null;
  watched_at: string;
}

export interface PlaylistRow {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  video_count?: number;
}

export interface PlaylistItemRow {
  id: string;
  playlist_id: string;
  video_id: string;
  title: string;
  author: string | null;
  author_id: string | null;
  thumbnail: string | null;
  length_seconds: number | null;
  position: number;
  added_at: string;
}

export interface LikedRow {
  id: string;
  video_id: string;
  title: string;
  author: string | null;
  author_id: string | null;
  thumbnail: string | null;
  length_seconds: number | null;
  liked_at: string;
}

export interface WatchLaterRow {
  id: string;
  video_id: string;
  title: string;
  author: string | null;
  author_id: string | null;
  thumbnail: string | null;
  length_seconds: number | null;
  added_at: string;
}

export interface PreferencesRow {
  user_id: string;
  autoplay: boolean;
  default_quality: string;
  theme: string;
}

export function useSubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    setSubscriptions(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const isSubscribed = useCallback((channelId: string) => {
    return subscriptions.some((s) => s.channel_id === channelId);
  }, [subscriptions]);

  const subscribe = useCallback(async (channelId: string, channelName: string, thumbnail: string | null) => {
    if (!user) return;
    await supabase.from('subscriptions').insert({
      channel_id: channelId,
      channel_name: channelName,
      channel_thumbnail: thumbnail,
    });
    load();
  }, [user, load]);

  const unsubscribe = useCallback(async (channelId: string) => {
    if (!user) return;
    await supabase.from('subscriptions').delete().eq('channel_id', channelId);
    load();
  }, [user, load]);

  return { subscriptions, loading, isSubscribed, subscribe, unsubscribe, reload: load };
}

export function useHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('watch_history')
      .select('*')
      .order('watched_at', { ascending: false });
    setHistory(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addToHistory = useCallback(async (video: {
    video_id: string;
    title: string;
    author?: string | null;
    author_id?: string | null;
    thumbnail?: string | null;
    length_seconds?: number | null;
  }) => {
    if (!user) return;
    await supabase.from('watch_history').upsert({
      video_id: video.video_id,
      title: video.title,
      author: video.author || null,
      author_id: video.author_id || null,
      thumbnail: video.thumbnail || null,
      length_seconds: video.length_seconds || null,
      watched_at: new Date().toISOString(),
    }, { onConflict: 'user_id,video_id' });
  }, [user]);

  const removeFromHistory = useCallback(async (videoId: string) => {
    if (!user) return;
    await supabase.from('watch_history').delete().eq('video_id', videoId);
    load();
  }, [user, load]);

  const clearHistory = useCallback(async () => {
    if (!user) return;
    await supabase.from('watch_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    load();
  }, [user, load]);

  return { history, loading, addToHistory, removeFromHistory, clearHistory, reload: load };
}

export function usePlaylists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setPlaylists([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('playlists')
      .select('*')
      .order('updated_at', { ascending: false });
    setPlaylists(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const createPlaylist = useCallback(async (title: string, description = '') => {
    if (!user) return null;
    const { data, error } = await supabase.from('playlists').insert({ title, description }).select().single();
    if (error || !data) return null;
    load();
    return data;
  }, [user, load]);

  const deletePlaylist = useCallback(async (playlistId: string) => {
    if (!user) return;
    await supabase.from('playlists').delete().eq('id', playlistId);
    load();
  }, [user, load]);

  const renamePlaylist = useCallback(async (playlistId: string, title: string, description?: string) => {
    if (!user) return;
    const update: Record<string, string> = { title, updated_at: new Date().toISOString() };
    if (description !== undefined) update.description = description;
    await supabase.from('playlists').update(update).eq('id', playlistId);
    load();
  }, [user, load]);

  const getPlaylistItems = useCallback(async (playlistId: string): Promise<PlaylistItemRow[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from('playlist_items')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });
    return data || [];
  }, [user]);

  const addToPlaylist = useCallback(async (playlistId: string, video: {
    video_id: string;
    title: string;
    author?: string | null;
    author_id?: string | null;
    thumbnail?: string | null;
    length_seconds?: number | null;
  }) => {
    if (!user) return;
    const items = await getPlaylistItems(playlistId);
    const maxPos = items.reduce((max, item) => Math.max(max, item.position), -1);
    await supabase.from('playlist_items').insert({
      playlist_id: playlistId,
      video_id: video.video_id,
      title: video.title,
      author: video.author || null,
      author_id: video.author_id || null,
      thumbnail: video.thumbnail || null,
      length_seconds: video.length_seconds || null,
      position: maxPos + 1,
    });
    await supabase.from('playlists').update({ updated_at: new Date().toISOString() }).eq('id', playlistId);
  }, [user, getPlaylistItems]);

  const removeFromPlaylist = useCallback(async (playlistId: string, itemId: string) => {
    if (!user) return;
    await supabase.from('playlist_items').delete().eq('id', itemId);
  }, [user]);

  return { playlists, loading, createPlaylist, deletePlaylist, renamePlaylist, getPlaylistItems, addToPlaylist, removeFromPlaylist, reload: load };
}

export function useLiked() {
  const { user } = useAuth();
  const [liked, setLiked] = useState<LikedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLiked([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('liked_videos')
      .select('*')
      .order('liked_at', { ascending: false });
    setLiked(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const isLiked = useCallback((videoId: string) => {
    return liked.some((v) => v.video_id === videoId);
  }, [liked]);

  const toggleLike = useCallback(async (video: {
    video_id: string;
    title: string;
    author?: string | null;
    author_id?: string | null;
    thumbnail?: string | null;
    length_seconds?: number | null;
  }) => {
    if (!user) return;
    const existing = liked.find((v) => v.video_id === video.video_id);
    if (existing) {
      await supabase.from('liked_videos').delete().eq('video_id', video.video_id);
    } else {
      await supabase.from('liked_videos').insert({
        video_id: video.video_id,
        title: video.title,
        author: video.author || null,
        author_id: video.author_id || null,
        thumbnail: video.thumbnail || null,
        length_seconds: video.length_seconds || null,
      });
    }
    load();
  }, [user, liked, load]);

  return { liked, loading, isLiked, toggleLike, reload: load };
}

export function useWatchLater() {
  const { user } = useAuth();
  const [watchLater, setWatchLater] = useState<WatchLaterRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setWatchLater([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('watch_later')
      .select('*')
      .order('added_at', { ascending: false });
    setWatchLater(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const isInWatchLater = useCallback((videoId: string) => {
    return watchLater.some((v) => v.video_id === videoId);
  }, [watchLater]);

  const toggleWatchLater = useCallback(async (video: {
    video_id: string;
    title: string;
    author?: string | null;
    author_id?: string | null;
    thumbnail?: string | null;
    length_seconds?: number | null;
  }) => {
    if (!user) return;
    const existing = watchLater.find((v) => v.video_id === video.video_id);
    if (existing) {
      await supabase.from('watch_later').delete().eq('video_id', video.video_id);
    } else {
      await supabase.from('watch_later').insert({
        video_id: video.video_id,
        title: video.title,
        author: video.author || null,
        author_id: video.author_id || null,
        thumbnail: video.thumbnail || null,
        length_seconds: video.length_seconds || null,
      });
    }
    load();
  }, [user, watchLater, load]);

  return { watchLater, loading, isInWatchLater, toggleWatchLater, reload: load };
}

export function usePreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<PreferencesRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setPrefs(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!data) {
      const { data: created } = await supabase
        .from('preferences')
        .insert({ user_id: user.id })
        .select()
        .maybeSingle();
      setPrefs(created as PreferencesRow | null);
    } else {
      setPrefs(data as PreferencesRow);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const updatePrefs = useCallback(async (updates: Partial<PreferencesRow>) => {
    if (!user || !prefs) return;
    const { data } = await supabase
      .from('preferences')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .maybeSingle();
    if (data) setPrefs(data as PreferencesRow);
  }, [user, prefs]);

  return { prefs, loading, updatePrefs, reload: load };
}
