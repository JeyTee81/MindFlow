# Mindflow - Description détaillée des fonctionnalités existantes

## Vue Utilisateur

Mindflow est une application SaaS (prototype) qui transforme un objectif en un plan d'actions sous forme de tâches dépendantes, exécutées progressivement par une architecture multi-agents IA.

### Comment démarrer

1. Ouvrir l'application.
2. Sur l'écran d’accueil, saisir un texte d’objectif dans la zone prévue (ex : lancer un produit SaaS).
3. Cliquer sur `Start Mission`.
4. L’application passe ensuite à l’écran `Dashboard` et affiche l’avancement en temps quasi-réel.

### Ce que l’utilisateur voit

#### Écran Accueil (`Home`)

- Un champ `objective` (textarea) pour saisir la mission.
- Un bouton de lancement :
  - `Start Mission` lorsque l’objectif est valide
  - “Starting Mission...” pendant l’appel de création
- En cas d’échec, une alerte est affichée : `Failed to start mission. Please try again.`

#### Écran Dashboard (`Dashboard`)

- Un panneau latéral `Agents` affichant :
  - la mission (son `objective`)
  - une liste de 3 agents : `Mission Planner`, `Task Executor`, `Analyst`
  - l’état global affiché en bas du panneau : `Status: ...` et le nombre de tâches
- Un graphe des tâches :
  - chaque nœud représente une tâche
  - les arêtes représentent les dépendances entre tâches
  - les couleurs indiquent le statut :
    - `planned` (prévu)
    - `in_progress` (en cours)
    - `completed` (terminé)

### Détails d’interaction

#### Visualisation d’une tâche

Sur chaque nœud de tâche, l’utilisateur voit :

- `title` (titre)
- `description` (description)
- un badge de statut (Planned / In Progress / Completed)
- `agent` (nom de l’agent assigné)
- un bouton `View Reasoning` uniquement si le champ `reasoning` est présent

#### Modal “AI Reasoning”

Quand l’utilisateur clique sur `View Reasoning`, une modal s’ouvre avec :

- le titre `AI Reasoning`
- le contenu du champ `reasoning` affiché ligne par ligne
- un bouton `×` pour fermer la modal

### Cycle de vie “mission”

Le comportement visible côté utilisateur correspond aux étapes suivantes :

1. `Start Mission` :
   - le backend génère les tâches (planning) à partir de l’objectif
   - le client reçoit immédiatement la mission avec des tâches en `planned`
2. Pendant l’exécution :
   - le client interroge régulièrement le backend pour récupérer la mission mise à jour
   - les tâches passent au statut `in_progress`, puis `completed`
3. Quand toutes les tâches sont `completed` :
   - le statut de mission passe à `completed`

### Freemium / Premium (règles produit)

- **Gratuit** : **1 run IA** pour la génération du plan (appel planner dans `create-mission`). Ensuite, plus de nouvelle mission tant que le profil reste `free` avec quota consommé.
- **Premium** : missions illimitées côté planner ; **exécution des tâches** (`start-execution`) réservée au profil `premium` (vérifié en Edge Function).
- **Merchant** : page `/upgrade` — définir `VITE_LEMON_CHECKOUT_URL` vers l’URL de checkout ; les webhooks du merchant doivent mettre à jour `profiles.subscription_tier` (à brancher).
- **Navigation** : `/` accueil, `/missions` liste, `/mission/:id` tableau de bord, `/upgrade` offre Premium, `/auth` connexion.

### Limites actuelles côté UX (observables)

- L’app applique une authentification Supabase (login/signup). Tant qu’aucune session n’est active, l’écran `Auth` s’affiche et la création de mission n’est pas exposée.
- Les “statuts d’agents” affichés dans `AgentPanel` ne sont pas réellement synchronisés avec le backend : le store contient des statuts internes, mais ils ne sont pas mis à jour via l’API (ils restent donc “idle” en pratique).
- Le routage utilise **React Router** : une mission est accessible via `/mission/:id` et la liste via `/missions` (rechargement possible).

## Vue Technique

## 1. Stack et architecture

### Frontend

- React 18 + TypeScript
- Vite (server de dev) et build via Vite
- UI et états :
  - `reactflow` pour afficher le graphe des tâches et leurs dépendances
  - `framer-motion` pour animations (particles, transitions de modals, etc.)
  - `zustand` pour le state de mission côté client
- Auth et communication API :
  - `@supabase/supabase-js` pour login/signup et récupérer le JWT
  - `axios` pour `POST /api/missions` et `GET /api/missions/:id` avec le header `Authorization: Bearer <jwt>`
- Proxy Vite :
  - tout appel côté client vers `/api/*` est proxy vers `http://localhost:5000`

Fichiers clés :

- `src/main.tsx` : bootstrap React
- `src/App.tsx` : sélection `Home` vs `Dashboard`
- `src/pages/Home.tsx` : formulaire et création de mission
- `src/pages/Dashboard.tsx` : polling + affichage
- `src/components/MissionGraph.tsx` : génération nœuds/arêtes
- `src/components/TaskNode.tsx` : présentation tâche + modal reasoning
- `src/components/ReasoningModal.tsx` : modal
- `src/components/AgentPanel.tsx` : panneau agents + statut global
- `src/store/useMissionStore.ts` : store Zustand + appels API
- `src/pages/Auth.tsx` : écran login/signup Supabase
- `src/store/useAuthStore.ts` : gestion session Supabase + stockage `accessToken`
- `src/lib/supabaseClient.ts` : client Supabase côté front

### Backend

- Node.js avec TypeScript (exécuté via `tsx watch`)
- Express.js :
  - parsing JSON
  - CORS
  - routes mission
- Intégration IA :
  - SDK `openai` (client HTTP) pointé vers **Mistral** (`baseURL` `https://api.mistral.ai/v1`)
  - modèle par défaut : `mistral-small-latest` (surchargeable via `MISTRAL_MODEL`)
- Auth côté backend :
  - vérification du JWT via Supabase (récupération du `user.id`)
- Persistance :
  - Supabase (tables `missions`, `tasks`, `task_dependencies`) au lieu du fichier JSON local
- Exécution IA :
  - planification (planner) côté backend
  - exécution (executor/analyst) dans une Edge Function Supabase

Fichiers clés :

- `server/server.ts` : app Express, mount des routes, endpoint `/health`
- `server/routes/mission.routes.ts` : crée mission/tasks en DB puis déclenche l’Edge Function
- `server/agents/*` : agents IA (planner/executor/analyst)
- `server/auth/getUserId.ts` : extrait le `userId` depuis le JWT
- `server/supabaseAdmin.ts` : client Supabase en `service_role` (admin)
- `server/types/mission.types.ts` : types `Mission` et `Task`

## 2. Modèle de données

### `Task` (backend + front)

Champs :

- `id: string`
- `title: string`
- `description: string`
- `status: 'planned' | 'in_progress' | 'completed'`
- `agent: string`
- `reasoning?: string`
- `result?: string`
- `dependencies?: string[]`

### `Mission`

Champs :

- `id: string`
- `objective: string`
- `tasks: Task[]`
- `status: 'planning' | 'executing' | 'completed'`
- `createdAt: string` (ISO)

## 3. API Express

### `GET /health`

- Renvoie `{ status: 'ok' }`

### `POST /api/missions/`

Requête attendue :

- header `Authorization: Bearer <jwt>`
- body JSON : `{ "objective": string }`

Comportement :

- extrait `userId` depuis le JWT
- retourne `400` si `objective` est absent/invalid
- appelle `MissionPlannerAgent` pour générer `tasks` + `dependencies`
- insère en Supabase :
  - `missions` (avec `user_id = userId` et `status = planning`)
  - `tasks` (avec `status = planned`)
  - `task_dependencies`
- reconstruit `task.dependencies: string[]` pour chaque tâche dans la réponse API
- renvoie la mission au client
- déclenche ensuite l’exécution via l’Edge Function `start-execution` (step execution)

### `GET /api/missions/:id`

- header `Authorization: Bearer <jwt>`
- extrait `userId` depuis le JWT
- renvoie la mission uniquement si elle appartient à l’utilisateur (`missions.user_id = userId`)
- reconstruit `task.dependencies: string[]` via `task_dependencies`
- `404` si la mission n’existe pas (ou non accessible)

## 4. Orchestration multi-agents

### Création d’une mission (`createMission`)

Fait :

- extrait `userId` depuis le JWT côté backend
- demande à `MissionPlannerAgent` une liste de tâches (5-10) avec `agent` et `dependencies`
- insère en Supabase :
  - `missions` avec `user_id = userId` et `status = planning` (UUID Supabase)
  - `tasks` avec `status = planned`
  - `task_dependencies` à partir des dépendances du planner (indices `index-X` -> IDs de tâches réelles)

Retour :

- une mission renvoyée au client sous forme compatible avec l’UI :
  - chaque tâche contient `dependencies: string[]` reconstruit à partir de `task_dependencies`

### Sélection de la prochaine tâche (`getNextTask`)

Règle (désormais côté Edge Function `start-execution`) :

- la fonction filtre les tâches `planned` d’une mission
- pour chaque tâche, on vérifie que toutes ses dépendances (via `task_dependencies`) sont `completed`
- si une tâche est éligible, elle est “claim” (idempotent) en `in_progress`
- si aucune tâche n’est éligible : no-op pour cette invocation

### Exécution d’une tâche (`executeTask`)

- exécution désormais réalisée dans la Edge Function `start-execution`
- “claim” idempotent (safe) :
  - mission `planning -> executing` (si encore `planning`)
  - tâche `planned -> in_progress` (si encore `planned`)
- exécution IA directe dans l’Edge :
  - si `task.agent === 'TaskExecutor'` : génération `Reasoning/Result/Next steps` et persistance de `reasoning` + `result`
  - sinon : génération des sections Analyst et persistance de `reasoning` + `result`

Retour :

- la tâche est marquée `status: 'completed'`
- `reasoning` et `result` sont sauvegardés dans la tâche

## 5. Boucle d’exécution côté routes

Localisée via une Edge Function Supabase en “step execution”.

Chronologie (nouvelle version) :

1. Le backend `POST /api/missions` crée les lignes `missions`, `tasks` et `task_dependencies` puis renvoie la mission au client.
2. Le backend déclenche `supabase/functions/v1/start-execution` (fire-and-forget) après un délai court.
3. Le backend ré-invoque l’Edge Function de façon “step execution” :
   - 1 tâche (max) par invocation “safe”
   - délai ~`1000ms`
   - limite `maxAttempts` pour éviter une exécution sans fin
4. L’Edge Function est idempotente :
   - “claim” mission/tâche uniquement si le champ `status` est encore dans l’état attendu (`planning` / `planned`)

## 6. Agents IA (prompts et format)

### Mission Planner (`MissionPlannerAgent`)

- Prompt système : décrit un rôle d’agent qui :
  - décompose l’objectif en 5-10 tâches séquentielles
  - identifie dépendances
  - assigne `agent` (`TaskExecutor` ou `Analyst`)
- Demande JSON :
  - utilise `response_format: { type: 'json_object' }`
- Parsing :
  - parse JSON via `JSON.parse(content)`
  - tolère deux formes :
    - `{ tasks: [...] }`
    - directement un tableau `[...]`

### Task Executor (`TaskExecutorAgent`)

- Prompt système : demande de fournir `Reasoning`, `Result`, `Next steps`
- Appel Mistral (API chat completions) :
  - aucune contrainte JSON
- Extraction :
  - `reasoning` via regex `Reasoning: ... (jusqu’à Result:)`
  - `result` via regex `Result: ... (jusqu’à Next steps:)`
  - `nextSteps` via regex `Next steps: ...`

### Analyst (`AnalystAgent`)

- Prompt système : demande :
  - Progress Analysis
  - Gaps Identified
  - Recommendations
  - Strategic Insights
- Extraction :
  - sections via regex (balayage entre intitulés)
  - listes via lignes `- ...` ou numérotation `1. ...`

## 7. UI : mapping tâche -> graphe

### `MissionGraph`

- Génère des nodes ReactFlow à partir de `currentMission.tasks`.
- Positionnement :
  - placement en grille basée sur l’index
- Couleurs :
  - `planned` : `#3b82f6`
  - `in_progress` : `#eab308`
  - `completed` : `#22c55e`
- Arêtes :
  - pour chaque `task.dependencies`, crée une arête :
    - `source = depId`
    - `target = task.id`
  - `animated: task.status === 'in_progress'` (animation côté arête)

### `TaskNode`

- Affiche l’essentiel (titre, description, statut, agent)
- Affiche `View Reasoning` seulement si `data.reasoning` existe
- Ouvre `ReasoningModal` si clic

## 8. Points notables / comportements implicites

- Il n’existe pas de mécanisme de sauvegarde “temps réel” côté client :
  - le client polling met à jour `currentMission` en remplaçant l’objet renvoyé par `GET /api/missions/:id`.
- Le champ `agents` dans `useMissionStore` est actuellement décoratif :
  - aucun endpoint ne fournit de statut d’agent
  - aucune logique ne relie l’exécution réelle (tâches en cours/terminées) au tableau `agents`.

