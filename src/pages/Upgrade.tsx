import { motion } from 'framer-motion'

/**
 * Page Premium — présentation des offres uniquement.
 * L’activation technique (Supabase, etc.) ne doit pas figurer ici (surface publique).
 * Optionnel : VITE_CONTACT_EMAIL = adresse pour un lien mailto « Demander l’accès ».
 */
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined

export default function Upgrade() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto overflow-x-hidden px-4 py-8 pb-16 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="mb-2 text-3xl font-bold text-white">Offres Mindflow</h1>
        <p className="mb-8 text-gray-400">
          L’<strong className="text-gray-200">abonnement Premium</strong> et la facturation ne sont{' '}
          <strong className="text-gray-200">pas disponibles en libre-service</strong> pour l’instant. L’accès aux
          fonctionnalités payantes se fait <strong className="text-gray-200">sur demande</strong>, au cas par cas.
        </p>

        <div className="mb-8 rounded-xl border border-blue-500/25 bg-blue-500/5 p-5">
          <h2 className="mb-2 text-lg font-semibold text-blue-200">Demander l’accès Premium</h2>
          <p className="text-sm leading-relaxed text-gray-300">
            Pour activer un compte Premium ou discuter d’un abonnement, contacte directement{' '}
            <strong className="text-white">l’équipe Mindflow</strong> (propriétaire du service). Les modalités et la
            mise à jour de ton compte sont traitées manuellement après accord.
          </p>
          {contactEmail ? (
            <a
              href={`mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent('Demande accès Premium — Mindflow')}`}
              className="mt-4 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Écrire pour demander l’accès
            </a>
          ) : (
            <p className="mt-4 text-sm text-gray-400">
              Utilise les coordonnées que tu communiques sur ton site ou tes canaux officiels pour joindre l’équipe
              Mindflow.
            </p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-amber-500/35 bg-night-blue/70 p-6">
            <h2 className="mb-1 text-lg font-semibold text-amber-200">Freemium</h2>
            <p className="mb-4 text-xs text-amber-200/60">Compte gratuit</p>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Jusqu’à <strong className="text-gray-200">10 générations de plan IA</strong> par mois (planner)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Création et consultation des <strong className="text-gray-200">missions</strong>, graphe des tâches, vues calendrier / aujourd’hui</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Validation manuelle des étapes, aide détaillée par tâche, debrief et « prochaine action » (logique locale)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-500">—</span>
                <span className="text-gray-500">
                  Pas d’exécution automatique des tâches par les agents IA (pas d’appels Mistral pour exécuter / compléter les étapes côté serveur)
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-night-blue/60 p-6">
            <h2 className="mb-1 text-lg font-semibold text-amber-100">Premium</h2>
            <p className="mb-4 text-xs text-amber-200/70">Sur demande</p>
            <ul className="space-y-3 text-sm text-gray-200">
              <li className="flex gap-2">
                <span className="text-amber-300">✓</span>
                <span>
                  <strong className="text-white">Génération de plans illimitée</strong> (plus de quota mensuel côté planner)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-300">✓</span>
                <span>
                  <strong className="text-white">Exécution des tâches par l’IA</strong> (agents Mistral côté backend pour produire raisonnement / résultats sur les étapes)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-300">✓</span>
                <span>Tout ce qui est inclus dans le Freemium (graphe, calendrier, validation utilisateur, etc.)</span>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-gray-600">
          Les droits effectifs de ton compte sont ceux enregistrés pour ton profil après validation d’un accès Premium.
        </p>
      </motion.div>
    </div>
  )
}
