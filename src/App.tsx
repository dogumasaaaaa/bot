import { useState } from 'react';
import { AuthProvider } from '@/lib/auth';
import { RouterProvider, useRouter } from '@/lib/router';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { HomePage } from '@/pages/HomePage';
import { SearchPage } from '@/pages/SearchPage';
import { WatchPage } from '@/pages/WatchPage';
import { ChannelPage } from '@/pages/ChannelPage';
import { PlaylistPage } from '@/pages/PlaylistPage';
import { SubscriptionsPage } from '@/pages/SubscriptionsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { LikedPage } from '@/pages/LikedPage';
import { WatchLaterPage } from '@/pages/WatchLaterPage';
import { ShortsPage } from '@/pages/ShortsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AuthPage } from '@/pages/AuthPage';

function AppContent() {
  const { route } = useRouter();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const isWatchPage = route.name === 'watch';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Header onToggleSidebar={() => setSidebarExpanded(!sidebarExpanded)} />
      <div className="flex">
        {!isWatchPage && <Sidebar expanded={sidebarExpanded} />}
        <main className="flex-1 min-w-0">
          {route.name === 'home' && <HomePage />}
          {route.name === 'search' && <SearchPage query={route.query} />}
          {route.name === 'watch' && <WatchPage videoId={route.videoId} list={route.list} />}
          {route.name === 'channel' && <ChannelPage channelId={route.channelId} />}
          {route.name === 'playlist' && <PlaylistPage playlistId={route.playlistId} />}
          {route.name === 'subscriptions' && <SubscriptionsPage />}
          {route.name === 'history' && <HistoryPage />}
          {route.name === 'library' && <LibraryPage />}
          {route.name === 'liked' && <LikedPage />}
          {route.name === 'watchlater' && <WatchLaterPage />}
          {route.name === 'shorts' && <ShortsPage />}
          {route.name === 'settings' && <SettingsPage />}
          {route.name === 'signin' && <AuthPage mode="signin" />}
          {route.name === 'signup' && <AuthPage mode="signup" />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppContent />
      </RouterProvider>
    </AuthProvider>
  );
}
