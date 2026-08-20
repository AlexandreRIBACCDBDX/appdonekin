'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LogoMark } from '@/components/LogoMark';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (signInError) {
        setError(signInError.message === 'Invalid login credentials' ? 'Identifiants incorrects.' : signInError.message);
        return;
      }

      try {
        await supabase.rpc('admin_touch_last_login');
      } catch {
        // non-critical — never block login on this
      }

      // Hard navigation on purpose: a soft router.replace/refresh right
      // after a client-side sign-in can race with the middleware reading
      // the just-set session cookie. A full page load guarantees the next
      // request the server sees carries whatever cookies actually landed.
      window.location.href = '/';
    } catch (err) {
      // Network/TLS/DNS failure reaching Supabase — surface it instead of
      // spinning forever with no feedback.
      setError(err instanceof Error ? `Erreur réseau : ${err.message}` : 'Erreur réseau inconnue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3">
            <LogoMark size={48} />
          </div>
          <h1 className="text-xl font-semibold text-white">DoneKin Admin</h1>
          <p className="mt-1 text-sm text-slate-400">Back office — accès réservé</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="admin@donekin.demo"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Mot de passe</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Réservé aux comptes DoneKin possédant un rôle plateforme actif.
        </p>
      </div>
    </div>
  );
}
