'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SearchResults {
  users: { id: string; full_name: string; email: string | null }[];
  members: { id: string; first_name: string; circle_id: string; circle_name: string; access_mode: string }[];
  circles: { id: string; name: string; type: string }[];
}

export function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 2) return;
    const handle = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc('admin_global_search', { p_query: query.trim() });
      setResults(data as unknown as SearchResults);
      setOpen(true);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const goTo = (path: string) => {
    setOpen(false);
    setQuery('');
    router.push(path);
  };

  const hasResults =
    results && (results.users.length > 0 || results.members.length > 0 || results.circles.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          if (value.trim().length < 2) setResults(null);
        }}
        onFocus={() => results && setOpen(true)}
        placeholder="Rechercher dans DoneKin... (nom, email, UUID)"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white"
      />
      {open && hasResults ? (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          {results!.users.length > 0 ? (
            <div className="mb-2">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Utilisateurs</p>
              {results!.users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => goTo(`/users/${u.id}`)}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{u.full_name}</span>
                  <span className="ml-2 text-slate-400">{u.email}</span>
                </button>
              ))}
            </div>
          ) : null}
          {results!.circles.length > 0 ? (
            <div className="mb-2">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Cercles</p>
              {results!.circles.map((c) => (
                <button
                  key={c.id}
                  onClick={() => goTo(`/circles/${c.id}`)}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{c.name}</span>
                  <span className="ml-2 text-slate-400">{c.type}</span>
                </button>
              ))}
            </div>
          ) : null}
          {results!.members.length > 0 ? (
            <div>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Membres</p>
              {results!.members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => goTo(`/circles/${m.circle_id}`)}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{m.first_name}</span>
                  <span className="ml-2 text-slate-400">
                    {m.circle_name} • {m.access_mode === 'guardian_managed' ? 'Profil géré' : 'Compte personnel'}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
