# DoneKin

**Get things done, together.** Plateforme collaborative de tâches, points et récompenses pour familles, couples, colocataires et groupes d'amis — avec une gestion native des enfants sans téléphone.

## Structure du monorepo

```
apps/
  mobile/    Application utilisateur — Expo / React Native / Expo Router
  admin/     Back office — Next.js, déployé séparément sur Vercel
supabase/
  migrations/  Schéma complet (tables, RLS, RPC) — partagé par les deux apps
  seed.sql     Données de démo : Famille Martin + un admin plateforme
```

Les deux apps partagent le même projet Supabase et s'authentifient toutes les deux via Supabase Auth — mais elles n'ont **aucune autorité en commun** : être owner d'un cercle dans l'app mobile ne donne aucun accès au back office, et inversement. Voir `apps/admin/README.md` pour le détail de cette séparation.

`types/database.ts` est dupliqué entre les deux apps plutôt que partagé via un package — volontairement, pour ne pas complexifier l'outillage (pas de workspaces npm) pour un fichier de ~450 lignes régénérable via `supabase gen types`. Garder les deux synchronisés à chaque migration de schéma.

## Démarrage

1. **Backend** — voir [apps/mobile/README.md](apps/mobile/README.md#démarrage-local) pour appliquer les migrations et le seed.
2. **App mobile** — [apps/mobile/README.md](apps/mobile/README.md).
3. **Back office admin** — [apps/admin/README.md](apps/admin/README.md).

## Comptes de démo (après `supabase/seed.sql`)

| Compte | Où se connecter | Email | Mot de passe |
|---|---|---|---|
| Paul, Julie, Emma (Famille Martin) | app mobile | `paul@donekin.demo` etc. | `donekin123` |
| Lucas (6 ans) | — | aucun compte, profil géré par Paul et Julie | — |
| DoneKin Admin | back office | `admin@donekin.demo` | `donekin123` |
