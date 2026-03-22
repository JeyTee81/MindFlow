# MINDFLOW / Mindflow

Application SaaS permettant de transformer des objectifs en plans d'actions structurés via une architecture multi-agents IA.

## Prérequis

- Node.js 18+
- npm ou yarn
- Compte [Supabase](https://supabase.com) (auth + base + Edge Functions)
- Clé API [Mistral AI](https://console.mistral.ai) (modèle économique pour démo / prod)

## Installation

```bash
npm install
```

## Variables d'environnement

### Développement local (racine du projet, fichier `.env`)

```env
# Mistral (obligatoire si tu utilises le serveur Node/agents en local)
MISTRAL_API_KEY=your_mistral_api_key
# Optionnel : défaut = mistral-small-latest
# MISTRAL_MODEL=mistral-small-latest

# Supabase (si tu fais tourner le backend Express avec persistance Supabase)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

PORT=5000
```

### Frontend (Vite) — préfixe `VITE_`

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
# Optionnel — checkout Lemon Squeezy (ou autre merchant) pour la page Premium
# VITE_LEMON_CHECKOUT_URL=https://...
```

### Base de données (freemium / profils)

Appliquer les migrations SQL dans le SQL Editor Supabase (dans l’ordre si besoin) :

- `supabase/migrations/20260320120000_profiles_freemium.sql` — profils, RLS, quotas  
- `supabase/migrations/20260320140000_planner_snapshot_task_validation.sql` — `planner_snapshot` (JSON complet du plan IA), `user_validated` sur les tâches  
- `supabase/migrations/20260320150000_freemium_monthly_ai_quota.sql` — `ai_quota_month` (quota **10** générations de plan / mois, plan gratuit)

Pour tester le **Premium** en local avant webhooks merchant :

```sql
update public.profiles set subscription_tier = 'premium' where id = 'TON_USER_UUID';
```

### Edge Functions Supabase (secrets)

```bash
npx supabase secrets set MISTRAL_API_KEY=your_mistral_api_key
# Optionnel :
# npx supabase secrets set MISTRAL_MODEL=mistral-small-latest
```

Les variables `SUPABASE_*` injectées par la plateforme ne se configurent pas avec `supabase secrets set` (noms réservés).

## Lancer l'application en local

```bash
npm run dev
```

- Frontend : `http://localhost:3000`
- Backend Express (si utilisé) : `http://localhost:5000`

## Déploiement

- **Frontend** : Vercel (GitHub + variables `VITE_SUPABASE_*`)
- **Backend logique** : Supabase Edge Functions (`create-mission`, `start-execution`) + secrets `MISTRAL_API_KEY`

## Stack

- **Frontend** : React, TypeScript, Vite, React Flow, Framer Motion, Tailwind, Zustand, Supabase Auth
- **IA** : Mistral AI (API compatible OpenAI), client `openai` avec `baseURL` Mistral côté serveur Node ; `fetch` vers `api.mistral.ai` côté Edge Functions
- **Données** : Supabase (PostgreSQL + RLS)

## Agents

- **MissionPlannerAgent** : découpe l’objectif en tâches
- **TaskExecutorAgent** : exécute une tâche
- **AnalystAgent** : analyse / recommandations
