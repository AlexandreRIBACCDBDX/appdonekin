'use client';

import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Hard navigation, same reasoning as the login page: guarantees the
    // server sees the cleared session cookie on the very next request.
    window.location.href = '/login';
  };

  return (
    <button
      onClick={onSignOut}
      className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
    >
      Se déconnecter
    </button>
  );
}
