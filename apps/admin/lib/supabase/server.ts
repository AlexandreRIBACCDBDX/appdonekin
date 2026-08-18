import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

// Used from Server Components, Route Handlers and Server Actions only. This
// client carries the CALLING ADMIN'S OWN session (anon key + their cookies)
// — never a service role key. Every admin_* RPC re-checks platform_admins
// itself, so there is nothing extra this client needs to bypass.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render — middleware refreshes
            // the session cookie on navigation, so this can be ignored.
          }
        },
      },
    }
  );
}
