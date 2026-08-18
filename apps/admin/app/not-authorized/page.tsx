import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/SignOutButton';

export default async function NotAuthorizedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-950 px-4">
      <div className="max-w-sm text-center">
        <div className="mb-3 text-4xl">🔒</div>
        <h1 className="text-lg font-semibold text-white">Accès non autorisé</h1>
        <p className="mt-2 text-sm text-slate-400">
          {user?.email} n&apos;a pas de rôle administrateur DoneKin actif. Un compte DoneKin classique (parent,
          membre...) ne donne aucun accès à ce back office.
        </p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
