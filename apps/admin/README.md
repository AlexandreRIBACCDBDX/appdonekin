# DoneKin Admin

Back office web pour l'équipe DoneKin — gestion des comptes, cercles, invitations, audit, configuration. Séparé de l'application mobile utilisateur, déployé indépendamment.

## Principe de sécurité

Ce back office **n'utilise jamais la `service_role_key`**. Il s'authentifie via le même Supabase Auth que l'app mobile (clé anon + session de l'admin), et chaque opération sensible passe par une fonction Postgres `admin_*` (`SECURITY DEFINER`) qui :

1. vérifie elle-même `is_platform_admin()` / `require_platform_role(...)` — jamais un simple `if (user.isAdmin)` côté frontend ;
2. exécute l'opération en bypassant RLS (puisqu'un admin plateforme n'est membre d'aucun cercle) ;
3. écrit une ligne dans `admin_audit_logs` pour toute mutation.

Voir `supabase/migrations/20260812091150_*.sql` à `20260812091400_admin_rpc.sql` à la racine du monorepo pour le détail.

`platform_admins` (rôles `super_admin` / `admin` / `support` / `moderator` / `read_only`) est un système d'autorité totalement séparé de `circle_members.role` — un parent owner d'un cercle n'a ici aucun privilège.

## Démarrage local

```bash
cp .env.example .env.local
# renseigner NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (même projet que apps/mobile)
npm install
npm run dev
```

Connecte-toi avec `admin@donekin.demo` / `donekin123` après avoir exécuté `supabase/seed.sql` (voir le README racine).

## Structure

```
app/
  login/                  Connexion (accessible sans session)
  not-authorized/         Compte DoneKin valide mais sans rôle plateforme
  (dashboard)/            Tout le reste — garde d'auth + de rôle dans layout.tsx
    page.tsx              Dashboard (stats, période 24h/7j/30j/90j)
    users/                Liste + fiche utilisateur (suspendre/réactiver)
    circles/              Liste + fiche cercle (membres, guardians, points, diagnostic tâche)
    invitations/          Liste + révoquer/renvoyer
    audit-logs/           Trace immuable des actions admin (super_admin/admin)
    administrators/       Gestion des rôles plateforme (super_admin uniquement)
    configuration/        Feature flags + paramètres globaux
lib/
  supabase/client.ts      Client navigateur (Client Components)
  supabase/server.ts      Client serveur (Server Components/Actions, cookies de l'admin)
  data.ts                 Lectures — wrappers typés autour des RPC admin_*
  actions.ts              Server Actions — mutations, chacune avec revalidatePath
components/               Sidebar, Header, SearchBox, ConfirmActionButton, tables...
proxy.ts                  Garde d'authentification (redirige vers /login si pas de session)
```

## Ce qui manque encore (P2, hors scope MVP)

- Révocation de session forcée (nécessiterait un Route Handler serveur utilisant l'API Admin GoTrue avec la service_role_key, strictement côté serveur).
- Impersonation — volontairement non implémentée (spec section 82).
- Analytics avancés (rétention, cohortes) au-delà des compteurs du dashboard.
- Export de données.
