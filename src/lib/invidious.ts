import type {
  VideoObject,
  ChannelObject,
  PlaylistObject,
  VideoDetails,
  CommentsResponse,
  ChannelDetails,
  ChannelVideosResponse,
  ChannelPlaylistsResponse,
  PlaylistDetails,
  MixResponse,
  SearchFilters,
  CommunityPost,
} from '@/types/invidious';

const PUBLIC_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.f5.si',
  'https://invidious.tiekoetter.com',
];

const STORAGE_KEY = 'yt-frontend-instance';
const FAILED_KEY = 'yt-frontend-failed-instances';
const FAILED_TTL = 5 * 60 * 1000; // 5 minutes

function getPreferredInstance(): string {
  return localStorage.getItem(STORAGE_KEY) || PUBLIC_INSTANCES[0];
}

function setPreferredInstance(url: string) {
  localStorage.setItem(STORAGE_KEY, url);
}

function getFailedInstances(): Set<string> {
  try {
    const raw = localStorage.getItem(FAILED_KEY);
    if (!raw) return new Set();
    const data = JSON.parse(raw) as { url: string; ts: number }[];
    const now = Date.now();
    return new Set(data.filter((e) => now - e.ts < FAILED_TTL).map((e) => e.url));
  } catch {
    return new Set();
  }
}

function markInstanceFailed(url: string) {
  try {
    const raw = localStorage.getItem(FAILED_KEY);
    const data: { url: string; ts: number }[] = raw ? JSON.parse(raw) : [];
    data.push({ url, ts: Date.now() });
    const now = Date.now();
    const filtered = data.filter((e) => now - e.ts < FAILED_TTL);
    localStorage.setItem(FAILED_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

function getAvailableInstances(): string[] {
  const failed = getFailedInstances();
  const available = PUBLIC_INSTANCES.filter((url) => !failed.has(url));
  return available.length > 0 ? available : PUBLIC_INSTANCES;
}

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const instances = getAvailableInstances();
  let lastError: Error | null = null;

  for (const base of instances) {
    try {
      const url = new URL(base + path);
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, value);
        }
      }
      url.searchParams.set('hl', 'en');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${base}`);
      }

      const data = await res.json();
      setPreferredInstance(base);
      return data as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      markInstanceFailed(base);
    }
  }

  throw lastError || new Error('All instances failed');
}

export const invidious = {
  getPreferredInstance,
  setPreferredInstance,
  getInstances: () => PUBLIC_INSTANCES,

  async getTrending(region?: string): Promise<VideoObject[]> {
    const params: Record<string, string> = {};
    if (region) params.region = region;
    return apiFetch<VideoObject[]>('/api/v1/trending', params);
  },

  async getPopular(): Promise<VideoObject[]> {
    return apiFetch<VideoObject[]>('/api/v1/popular');
  },

  async getVideo(id: string): Promise<VideoDetails> {
    return apiFetch<VideoDetails>(`/api/v1/videos/${id}`);
  },

  async getComments(id: string, continuation?: string): Promise<CommentsResponse> {
    const params: Record<string, string> = {};
    if (continuation) params.continuation = continuation;
    return apiFetch<CommentsResponse>(`/api/v1/comments/${id}`, params);
  },

  async getCaptions(id: string, label?: string): Promise<string> {
    const params: Record<string, string> = {};
    if (label) params.label = label;
    return apiFetch<string>(`/api/v1/captions/${id}`, params);
  },

  async search(query: string, filters?: SearchFilters, page = 1): Promise<VideoObject[] | (VideoObject | ChannelObject | PlaylistObject)[]> {
    const params: Record<string, string> = { q: query, page: String(page) };
    if (filters) {
      if (filters.sort_by) params.sort_by = filters.sort_by;
      if (filters.date) params.date = filters.date;
      if (filters.duration) params.duration = filters.duration;
      if (filters.type && filters.type !== 'all') params.type = filters.type;
      if (filters.features) params.features = filters.features.join(',');
      if (filters.region) params.region = filters.region;
    }
    return apiFetch<VideoObject[] | (VideoObject | ChannelObject | PlaylistObject)[]>('/api/v1/search', params);
  },

  async getSearchSuggestions(query: string): Promise<string[]> {
    const data = await apiFetch<{ query: string; suggestions: string[] }>('/api/v1/search/suggestions', { q: query });
    return data.suggestions || [];
  },

  async getChannel(id: string): Promise<ChannelDetails> {
    return apiFetch<ChannelDetails>(`/api/v1/channels/${id}`);
  },

  async getChannelVideos(id: string, continuation?: string, sort_by: string = 'newest'): Promise<ChannelVideosResponse> {
    const params: Record<string, string> = { sort_by };
    if (continuation) params.continuation = continuation;
    return apiFetch<ChannelVideosResponse>(`/api/v1/channels/${id}/videos`, params);
  },

  async getChannelShorts(id: string, continuation?: string): Promise<ChannelVideosResponse> {
    const params: Record<string, string> = {};
    if (continuation) params.continuation = continuation;
    return apiFetch<ChannelVideosResponse>(`/api/v1/channels/${id}/shorts`, params);
  },

  async getChannelStreams(id: string, continuation?: string): Promise<ChannelVideosResponse> {
    const params: Record<string, string> = {};
    if (continuation) params.continuation = continuation;
    return apiFetch<ChannelVideosResponse>(`/api/v1/channels/${id}/streams`, params);
  },

  async getChannelPlaylists(id: string, continuation?: string): Promise<ChannelPlaylistsResponse> {
    const params: Record<string, string> = {};
    if (continuation) params.continuation = continuation;
    return apiFetch<ChannelPlaylistsResponse>(`/api/v1/channels/${id}/playlists`, params);
  },

  async getChannelCommunity(id: string, continuation?: string): Promise<{ authorId: string; comments: CommunityPost[]; continuation?: string }> {
    const params: Record<string, string> = {};
    if (continuation) params.continuation = continuation;
    return apiFetch<{ authorId: string; comments: CommunityPost[]; continuation?: string }>(`/api/v1/channels/${id}/community`, params);
  },

  async getChannelSearch(id: string, query: string, page = 1): Promise<VideoObject[]> {
    return apiFetch<VideoObject[]>(`/api/v1/channels/${id}/search`, { q: query, page: String(page) });
  },

  async getPlaylist(id: string): Promise<PlaylistDetails> {
    return apiFetch<PlaylistDetails>(`/api/v1/playlists/${id}`);
  },

  async getMix(id: string): Promise<MixResponse> {
    return apiFetch<MixResponse>(`/api/v1/mixes/${id}`);
  },

  async getHashtag(tag: string): Promise<VideoObject[]> {
    return apiFetch<VideoObject[]>(`/api/v1/hashtag/${tag}`);
  },

  async resolveUrl(url: string): Promise<{ url: string; playlistId?: string; videoId?: string }> {
    return apiFetch<{ url: string; playlistId?: string; videoId?: string }>('/api/v1/resolveurl', { url });
  },
};
