import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'search'; query: string }
  | { name: 'watch'; videoId: string; list?: string }
  | { name: 'channel'; channelId: string }
  | { name: 'playlist'; playlistId: string }
  | { name: 'subscriptions' }
  | { name: 'history' }
  | { name: 'library' }
  | { name: 'liked' }
  | { name: 'watchlater' }
  | { name: 'shorts' }
  | { name: 'hashtag'; tag: string }
  | { name: 'settings' }
  | { name: 'signin' }
  | { name: 'signup' };

interface RouterContextValue {
  route: Route;
  navigate: (route: Route) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function parseHash(): Route {
  const hash = window.location.hash.slice(1);
  if (!hash || hash === '/') return { name: 'home' };

  const [path, queryString] = hash.split('?');
  const segments = path.split('/').filter(Boolean);
  const params = new URLSearchParams(queryString || '');

  switch (segments[0]) {
    case 'search':
      return { name: 'search', query: params.get('q') || '' };
    case 'watch':
      return { name: 'watch', videoId: segments[1] || '', list: params.get('list') || undefined };
    case 'channel':
      return { name: 'channel', channelId: segments[1] || '' };
    case 'playlist':
      return { name: 'playlist', playlistId: segments[1] || '' };
    case 'subscriptions':
      return { name: 'subscriptions' };
    case 'history':
      return { name: 'history' };
    case 'library':
      return { name: 'library' };
    case 'liked':
      return { name: 'liked' };
    case 'watchlater':
      return { name: 'watchlater' };
    case 'shorts':
      return { name: 'shorts' };
    case 'hashtag':
      return { name: 'hashtag', tag: segments[1] || '' };
    case 'settings':
      return { name: 'settings' };
    case 'signin':
      return { name: 'signin' };
    case 'signup':
      return { name: 'signup' };
    default:
      return { name: 'home' };
  }
}

function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/';
    case 'search':
      return `/search?q=${encodeURIComponent(route.query)}`;
    case 'watch':
      return route.list ? `/watch/${route.videoId}?list=${route.list}` : `/watch/${route.videoId}`;
    case 'channel':
      return `/channel/${route.channelId}`;
    case 'playlist':
      return `/playlist/${route.playlistId}`;
    case 'subscriptions':
      return '/subscriptions';
    case 'history':
      return '/history';
    case 'library':
      return '/library';
    case 'liked':
      return '/liked';
    case 'watchlater':
      return '/watchlater';
    case 'shorts':
      return '/shorts';
    case 'hashtag':
      return `/hashtag/${route.tag}`;
    case 'settings':
      return '/settings';
    case 'signin':
      return '/signin';
    case 'signup':
      return '/signup';
  }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const handler = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((newRoute: Route) => {
    const hash = routeToHash(newRoute);
    if (window.location.hash.slice(1) !== hash) {
      window.location.hash = hash;
    } else {
      window.scrollTo(0, 0);
    }
    setRoute(newRoute);
  }, []);

  return <RouterContext.Provider value={{ route, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
