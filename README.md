# MISSIONFLOW

Application SaaS permettant de transformer des objectifs en plans d'actions structurés via une architecture multi-agents IA.

## 🚀 Installation

### Prérequis

- Node.js 18+ 
- npm ou yarn
- Clé API OpenAI

### Étapes

1. **Cloner et installer les dépendances**

```bash
npm install
```

2. **Configurer les variables d'environnement**

Créez un fichier `.env` à la racine :

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=5000
```

3. **Lancer l'application**

```bash
npm run dev
```

Cela lance simultanément :
- Frontend sur `http://localhost:3000`
- Backend sur `http://localhost:5000`

## 📁 Structure du Projet

```
missionflow/
├── src/                    # Frontend React
│   ├── pages/             # Pages (Home, Dashboard)
│   ├── components/        # Composants React
│   ├── store/             # Zustand store
│   └── App.tsx
├── server/                # Backend Node.js
│   ├── agents/           # Agents IA
│   ├── orchestrator/     # Orchestrateur
│   ├── routes/           # Routes API
│   ├── store/            # Stockage missions
│   └── server.ts
└── package.json
```

## 🤖 Agents IA

### MissionPlannerAgent
Transforme l'objectif utilisateur en tâches structurées avec dépendances.

### TaskExecutorAgent
Exécute les tâches et génère du contenu/plans.

### AnalystAgent
Analyse la progression et propose des améliorations.

## 🎨 Fonctionnalités

- Interface graphique avec React Flow
- Visualisation en temps réel de l'exécution
- Raisonnement IA visible pour chaque tâche
- Animations fluides avec Framer Motion
- Architecture multi-agents orchestrée

## 🔧 Technologies

- **Frontend**: React, TypeScript, Vite, Framer Motion, React Flow, Tailwind CSS, Zustand
- **Backend**: Node.js, Express, OpenAI API (GPT-4o)
- **Stockage**: JSON (fichier)

## 📝 Notes

- Les missions sont sauvegardées dans `server/data/missions.json`
- Chaque fichier respecte la limite de 200 lignes
- L'application est prête pour une évolution SaaS
