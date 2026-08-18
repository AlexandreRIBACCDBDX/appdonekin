import { SearchBox } from '@/components/SearchBox';
import { SignOutButton } from '@/components/SignOutButton';

const ENV_LABELS: Record<string, { label: string; classes: string }> = {
  production: { label: 'PRODUCTION', classes: 'bg-red-600 text-white' },
  preview: { label: 'STAGING', classes: 'bg-amber-500 text-white' },
  development: { label: 'DEVELOPMENT', classes: 'bg-slate-600 text-white' },
};

export function Header({ email }: { email: string | null }) {
  const vercelEnv = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development';
  const env = ENV_LABELS[vercelEnv] ?? ENV_LABELS.development;

  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
      <span className={`rounded px-2 py-1 text-[10px] font-bold tracking-wide ${env.classes}`}>{env.label}</span>
      <SearchBox />
      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-slate-600">{email}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
