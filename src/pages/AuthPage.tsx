import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';

export function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const { signIn, signUp } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      navigate({ name: 'home' });
    }
  };

  const isSignIn = mode === 'signin';

  return (
    <div className="flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-medium text-neutral-100 mb-6 text-center">
          {isSignIn ? 'Sign in' : 'Create account'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-neutral-800 text-neutral-100 px-4 py-2.5 rounded-lg border border-neutral-700 focus:outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-neutral-800 text-neutral-100 px-4 py-2.5 rounded-lg border border-neutral-700 focus:outline-none focus:border-blue-500"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignIn ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-neutral-500 text-center mt-4">
          {isSignIn ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => navigate({ name: isSignIn ? 'signup' : 'signin' })}
            className="text-blue-400 hover:underline"
          >
            {isSignIn ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
