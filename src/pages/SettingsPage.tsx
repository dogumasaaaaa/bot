import { useAuth } from '@/lib/auth';
import { usePreferences } from '@/lib/hooks';
import { useRouter } from '@/lib/router';
import { LoadingSpinner } from '@/components/VideoCard';
import { invidious } from '@/lib/invidious';

export function SettingsPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const { prefs, loading, updatePrefs } = usePreferences();
  const instances = invidious.getInstances();
  const currentInstance = invidious.getPreferredInstance();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-neutral-400">Sign in to manage your settings.</p>
        <button onClick={() => navigate({ name: 'signin' })} className="px-6 py-2 bg-neutral-200 text-neutral-900 rounded-full font-medium">
          Sign in
        </button>
      </div>
    );
  }

  if (loading || !prefs) return <LoadingSpinner />;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-lg font-medium text-neutral-100">Settings</h1>

      {/* Playback settings */}
      <div className="bg-neutral-800 rounded-lg p-4 space-y-4">
        <h2 className="text-sm font-medium text-neutral-200">Playback</h2>

        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-300">Autoplay</span>
          <button
            onClick={() => updatePrefs({ autoplay: !prefs.autoplay })}
            className={`w-12 h-6 rounded-full transition-colors ${prefs.autoplay ? 'bg-blue-600' : 'bg-neutral-600'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${prefs.autoplay ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-300">Default quality</span>
          <select
            value={prefs.default_quality}
            onChange={(e) => updatePrefs({ default_quality: e.target.value })}
            className="bg-neutral-700 text-neutral-200 text-sm px-3 py-1.5 rounded-lg border border-neutral-600"
          >
            <option value="auto">Auto</option>
            <option value="144p">144p</option>
            <option value="240p">240p</option>
            <option value="360p">360p</option>
            <option value="480p">480p</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
            <option value="1440p">1440p</option>
            <option value="2160p">2160p (4K)</option>
          </select>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-neutral-800 rounded-lg p-4 space-y-4">
        <h2 className="text-sm font-medium text-neutral-200">Appearance</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-300">Theme</span>
          <select
            value={prefs.theme}
            onChange={(e) => updatePrefs({ theme: e.target.value })}
            className="bg-neutral-700 text-neutral-200 text-sm px-3 py-1.5 rounded-lg border border-neutral-600"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>

      {/* Instance selection */}
      <div className="bg-neutral-800 rounded-lg p-4 space-y-4">
        <h2 className="text-sm font-medium text-neutral-200">Invidious instance</h2>
        <p className="text-xs text-neutral-500">
          The backend server that fetches YouTube data. If one is slow or down, the app automatically falls back to another.
        </p>
        <div className="space-y-2">
          {instances.map((inst) => (
            <label key={inst} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="instance"
                checked={currentInstance === inst}
                onChange={() => invidious.setPreferredInstance(inst)}
                className="accent-blue-600"
              />
              <span className="text-sm text-neutral-300">{inst}</span>
              {currentInstance === inst && <span className="text-xs text-blue-400">Active</span>}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
