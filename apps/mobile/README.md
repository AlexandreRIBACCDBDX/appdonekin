# DoneKin

**Get things done, together.** DoneKin est une application collaborative de gestion des tâches, points, récompenses et projets pour les familles, couples, colocataires et groupes d'amis — pensée dès la conception pour les enfants qui n'ont pas encore leur propre téléphone.

## Sommaire

- [Architecture](#architecture)
- [Modèle Compte vs Membre](#modèle-compte-vs-membre)
- [Modèle de données](#modèle-de-données)
- [Structure du projet](#structure-du-projet)
- [Démarrage local](#démarrage-local)
- [Déploiement](#déploiement)
- [Comptes de démonstration](#comptes-de-démonstration)
- [État du MVP](#état-du-mvp)

## Architecture

```
React Native (Expo, Expo Router, TypeScript)
        │
        ├── TanStack Query  ── cache/fetch/mutations, source de vérité = Supabase
        ├── Zustand         ── UI state uniquement (cercle actif sélectionné)
        └── @supabase/supabase-js
                │
                ▼
        Supabase (PostgreSQL + Auth + Realtime + Storage)
                │
                ├── Row Level Security sur TOUTES les tables
                ├── RPC SECURITY DEFINER pour toute opération sensible
                │     (points, validations, invitations, permissions)
                └── Triggers de verrouillage de colonnes sensibles
```

- **Frontend** : Expo + Expo Router (mobile-first, iOS/Android/Web), TypeScript strict.
- **Backend** : Supabase — Postgres, Auth, RLS, Realtime, Storage, RPC.
- **Hosting web** : Vercel (export statique Expo Web en SPA).
- **Hosting natif** : Expo EAS Build (Vercel n'héberge pas les binaires iOS/Android).
- **Sécurité des points** : aucun solde n'est stocké — tout se recalcule depuis `point_transactions`, un ledger append-only. Les seules écritures possibles passent par des fonctions Postgres `SECURITY DEFINER` (`complete_task`, `validate_task_completion`, `redeem_reward`, `transfer_points`, `grant_bonus_points`), jamais par un `INSERT`/`UPDATE` direct du client.

## Modèle Compte vs Membre

C'est la décision d'architecture centrale du produit :

```
auth.users (Supabase Auth)
     │ optionnel, 1:1
     ▼
profiles                     ← un compte réel, capable de se connecter
     │
     │ optionnel (peut être NULL)
     ▼
circle_members                ← un "profil DoneKin" dans un cercle donné
     │  - user_id NULLABLE : un enfant sans téléphone existe ici
     │    sans jamais avoir de ligne dans auth.users / profiles
     │  - access_mode: 'personal_account' | 'guardian_managed'
     │
     ├── guardian_relationships (many-to-many)
     │     un membre géré peut avoir plusieurs responsables,
     │     un responsable peut gérer plusieurs membres
     │
     ├── tasks / task_completions
     │     task_completions distingue TOUJOURS :
     │       performed_by_member_id   (qui a réellement fait l'action)
     │       recorded_by_user_id      (quel compte a cliqué — audit)
     │
     ├── point_transactions (ledger)
     ├── project_members
     └── reward_redemptions
```

Quand un enfant géré obtient son propre téléphone (ou qu'un ami invité crée enfin son compte), une **invitation avec `target_member_id`** permet de rattacher le nouveau compte à la ligne `circle_members` existante (`accept_invitation` RPC) — aucune donnée (points, historique, tâches) n'est jamais dupliquée ou perdue.

## Modèle de données

| Table | Rôle |
|---|---|
| `profiles` | Comptes authentifiés (1:1 avec `auth.users`) |
| `circles` | Un cercle privé (famille, amis, couple, colocation...) |
| `circle_members` | Un membre d'un cercle — avec ou sans compte |
| `guardian_relationships` | Qui gère qui, avec quelles permissions fines |
| `tasks` / `task_completions` | Tâches et leur historique de réalisation/validation |
| `projects` / `project_members` | Projets collaboratifs regroupant des tâches |
| `rewards` / `reward_redemptions` | Récompenses et leur utilisation |
| `point_transactions` | Ledger de points — seule source de vérité du solde |
| `activity_events` | Feed d'activité du cercle |
| `notifications` | Notifications in-app (par compte) |
| `invitations` | Invitations à rejoindre un cercle ou réclamer un profil géré |
| `audit_log` | Traçabilité des actions sensibles (permissions, rattachement de compte...) |

Le schéma complet (enums, contraintes, index, RLS, fonctions) est dans [`supabase/migrations/`](../../supabase/migrations) à la racine du monorepo (partagé avec `apps/admin`), à exécuter dans l'ordre chronologique des fichiers. Chaque fichier documente en commentaire les décisions non triviales.

### Sécurité (RLS)

- Toute table est filtrée par appartenance au cercle (`is_circle_member`, `is_circle_admin`).
- `point_transactions`, `task_completions`, `reward_redemptions`, `invitations`, `audit_log` n'ont **aucune policy d'écriture cliente** : seules les fonctions RPC (exécutées avec les privilèges du propriétaire) peuvent y écrire.
- Des triggers `BEFORE UPDATE` empêchent un client authentifié de modifier directement `user_id`, `access_mode` ou `circle_id` sur `circle_members`, ou `circle_id`/`created_by_user_id` sur `tasks`/`projects`/`rewards` — ces champs ne changent que via les RPC dédiées.

## Structure du projet

```
app/                    Écrans (Expo Router, file-based routing)
  (auth)/               Welcome, Login, Register, Forgot password
  (onboarding)/         Choix, création/jonction de cercle, ajout de membres
  (app)/
    (tabs)/             Accueil, Tâches, Projets, Profil (+ bouton central)
    task/ project/ circle/ wallet/ rewards/ activity/ notifications/
components/
  ui/                   Design system (Button, Card, Avatar, Badge, TextField...)
  features/             Composants métier réutilisables (AddMemberForm, MemberRow...)
hooks/                  Hooks TanStack Query par domaine
services/               Fonctions d'accès Supabase (RPC + requêtes typées)
providers/              AuthProvider, ActiveCircleProvider
store/                  Zustand (sélection du cercle actif)
types/database.ts       Types TypeScript miroir du schéma SQL (dupliqué dans apps/admin/types, à garder synchronisé)
```

`supabase/` (migrations, seed, config) vit à la racine du monorepo — voir le [README racine](../../README.md) — car elle est partagée avec `apps/admin`, le back office.

## Démarrage local

### 1. Supabase

Depuis la racine du monorepo :

```bash
npx supabase login
npx supabase link --project-ref <votre-ref-projet>
npx supabase db push        # applique toutes les migrations
psql "<connection-string>" -f supabase/seed.sql   # optionnel : données de démo
```

Ou en local avec Docker :

```bash
npx supabase start
npx supabase db reset       # migrations + seed automatiquement
```

### 2. Variables d'environnement

```bash
cp .env.example .env
# renseigner EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### 3. Application

```bash
npm install
npm run start      # puis 'i' (iOS), 'a' (Android) ou 'w' (web)
npm run typecheck  # TypeScript strict, zéro any
```

## Déploiement

### Web → Vercel

`vercel.json` est déjà configuré (`npm run build:web`, sortie dans `dist/`, rewrite SPA). Sur Vercel :

1. Importer le repo.
2. Ajouter `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans les variables d'environnement du projet Vercel.
3. Déployer — Vercel utilisera `npm run build:web` automatiquement.

> L'app est exportée en **SPA** (`web.output: "single"`), pas en prérendu statique : tous les écrans sont derrière l'authentification, un prérendu serveur n'apporterait rien et casserait l'initialisation du client Supabase (qui a besoin de `window`).

### iOS / Android → EAS Build

Vercel n'héberge pas de binaires natifs — c'est le rôle d'EAS.

```bash
npm install -g eas-cli
eas login
eas build:configure
# remplacer les placeholders EXPO_PUBLIC_* dans eas.json par vos vraies valeurs
eas build --profile preview --platform all
eas submit --platform ios
eas submit --platform android
```

## Comptes de démonstration

Après avoir exécuté `supabase/seed.sql` :

| Compte | Email | Mot de passe | Rôle |
|---|---|---|---|
| Paul | paul@donekin.demo | donekin123 | Owner / Parent |
| Julie | julie@donekin.demo | donekin123 | Admin / Parent |
| Emma | emma@donekin.demo | donekin123 | Enfant, compte personnel |
| Lucas | — | — | Enfant, **sans compte**, géré par Paul et Julie |
| DoneKin Admin | admin@donekin.demo | donekin123 | Platform `super_admin` — se connecte sur `apps/admin`, pas ici. Sans lien avec Famille Martin. |

## État du MVP

**P0 (fait)** — auth, onboarding, cercles, membres, parents/enfants, enfants sans téléphone, tâches, attribution, validation, ledger de points, wallet, dashboard, historique, RLS complète.

**P1 (fait)** — projets, récompenses, invitations, notifications in-app, feed d'activité.

**P2 (non fait, prévu)** — push notifications Expo (l'architecture des notifications in-app est déjà prête à brancher dessus), réactions/commentaires sur le feed, widgets, rappels de deadline automatiques (nécessiterait un `pg_cron` ou une Edge Function planifiée).
