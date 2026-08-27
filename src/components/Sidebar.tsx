import { Home, Flame, Users, Clock, ThumbsUp, ListVideo, PlaySquare, Settings, LogIn, LogOut } from 'lucide-react';
import { useRouter, type Route } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useSubscriptions } from '@/lib/hooks';
import { navItem } from '@/components/Header';

export function Sidebar({ expanded }: { expanded: boolean }) {
  const { route, navigate } = useRouter();
  const { user, signOut } = useAuth();
  const { subscriptions } = useSubscriptions();

  if (!expanded) return null;

  const isActive = (name: string) => route.name === name;

  return (
    <aside className="w-60 shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto bg-neutral-900 border-r border-neutral-800 p-3">
      <nav className="space-y-1">
        {navItem(<Home size={22} />, 'Home', { name: 'home' }, navigate, isActive('home'))}
        {navItem(<Flame size={22} />, 'Shorts', { name: 'shorts' }, navigate, isActive('shorts'))}
        {navItem(<Users size={22} />, 'Subscriptions', { name: 'subscriptions' }, navigate, isActive('subscriptions'))}
      </nav>

      {user && (
        <>
          <hr className="my-3 border-neutral-800" />
          <div className="px-3 py-1 text-xs text-neutral-500 uppercase">You</div>
          <nav className="space-y-1">
            {navItem(<ListVideo size={22} />, 'Library', { name: 'library' }, navigate, isActive('library'))}
            {navItem(<Clock size={22} />, 'History', { name: 'history' }, navigate, isActive('history'))}
            {navItem(<ThumbsUp size={22} />, 'Liked videos', { name: 'liked' }, navigate, isActive('liked'))}
            {navItem(<PlaySquare size={22} />, 'Watch later', { name: 'watchlater' }, navigate, isActive('watchlater'))}
          </nav>

          {subscriptions.length > 0 && (
            <>
              <hr className="my-3 border-neutral-800" />
              <div className="px-3 py-1 text-xs text-neutral-500 uppercase">Subscriptions</div>
              <nav className="space-y-1">
                {subscriptions.map((sub) => (
                  <button
                    key={sub.channel_id}
                    onClick={() => navigate({ name: 'channel', channelId: sub.channel_id })}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
                  >
                    {sub.channel_thumbnail ? (
                      <img src={sub.channel_thumbnail} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-neutral-700" />
                    )}
                    <span className="truncate">{sub.channel_name}</span>
                  </button>
                ))}
              </nav>
            </>
          )}
        </>
      )}

      <hr className="my-3 border-neutral-800" />
      <nav className="space-y-1">
        {navItem(<Settings size={22} />, 'Settings', { name: 'settings' }, navigate, isActive('settings'))}
        {user ? (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-6 px-3 py-2.5 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800"
          >
            <LogOut size={22} />
            <span>Sign out</span>
          </button>
        ) : (
          <>
            {navItem(<LogIn size={22} />, 'Sign in', { name: 'signin' }, navigate, isActive('signin'))}
            {navItem(<LogIn size={22} />, 'Sign up', { name: 'signup' }, navigate, isActive('signup'))}
          </>
        )}
      </nav>
    </aside>
  );
}
