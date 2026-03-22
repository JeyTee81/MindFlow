import { motion } from 'framer-motion'

const checkoutUrl = import.meta.env.VITE_LEMON_CHECKOUT_URL as string | undefined

/**
 * Page Premium — branchement merchant (ex. Lemon Squeezy).
 * Définir VITE_LEMON_CHECKOUT_URL dans .env.local vers l’URL de checkout du produit.
 */
export default function Upgrade() {
  return (
    <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-2">Mindflow Premium</h1>
        <p className="text-gray-400 mb-6">
          Le plan gratuit inclut <strong className="text-white">1 run IA</strong> pour générer ton plan de mission.
          Le plan Premium débloque l’<strong className="text-white">exécution des tâches par l’IA</strong> et une
          gestion de projet complète (évolution prévue : file de jobs async, suivis).
        </p>

        <div className="rounded-xl border border-amber-500/30 bg-night-blue/60 p-6 mb-8">
          <h2 className="text-lg font-semibold text-amber-200 mb-2">Freemium</h2>
          <ul className="text-gray-300 text-sm space-y-2 list-disc list-inside">
            <li>1 génération de plan (planner IA)</li>
            <li>Consultation du graphe et de la liste des missions</li>
          </ul>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-night-blue/60 p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-200 mb-2">Premium</h2>
          <ul className="text-gray-300 text-sm space-y-2 list-disc list-inside">
            <li>Exécution des tâches par les agents IA</li>
            <li>Missions illimitées (runs planner)</li>
            <li>Paiement / abonnement géré par ton merchant (ex. Lemon Squeezy)</li>
          </ul>
        </div>

        <div className="rounded-xl border border-gray-600/40 bg-night-blue/40 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Comment passer en Premium ?</h2>
          <div className="text-gray-300 text-sm space-y-4">
            <div>
              <p className="font-medium text-gray-200 mb-1">1. Test / développement</p>
              <p>
                Dans le <strong className="text-white">SQL Editor</strong> Supabase (projet prod ou test), exécute en
                remplaçant l’UUID par ton <code className="text-gray-400">user id</code> (voir Auth → Users ou page{' '}
                <strong className="text-white">Profil</strong> → email) :
              </p>
              <pre className="mt-2 p-3 rounded bg-black/40 text-xs text-green-300/90 overflow-x-auto">
                {`update public.profiles
set subscription_tier = 'premium'
where id = 'TON_UUID_UTILISATEUR';`}
              </pre>
              <p className="mt-2 text-gray-500">
                Puis recharge l’app ou clique « Rafraîchir le plan » sur la page Profil.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-200 mb-1">2. Production (Lemon Squeezy ou autre merchant)</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Crée un produit / abonnement chez le merchant.</li>
                <li>
                  Ajoute l’URL de checkout dans <code className="text-gray-500">VITE_LEMON_CHECKOUT_URL</code> (bouton
                  ci-dessous).
                </li>
                <li>
                  Configure un <strong className="text-gray-300">webhook</strong> (ex. Edge Function Supabase) qui, sur
                  paiement validé, exécute le même <code className="text-gray-500">update profiles … premium</code> pour
                  l’utilisateur concerné (email ou id fourni par le merchant).
                </li>
              </ul>
            </div>
          </div>
        </div>

        {checkoutUrl ? (
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors"
          >
            Passer à Premium
          </a>
        ) : (
          <p className="text-sm text-gray-500">
            Configure <code className="text-gray-400">VITE_LEMON_CHECKOUT_URL</code> (ou l’URL de checkout de ton
            merchant) dans <code className="text-gray-400">.env.local</code>, puis connecte les webhooks pour mettre à
            jour <code className="text-gray-400">profiles.subscription_tier</code> à{' '}
            <code className="text-gray-400">premium</code>.
          </p>
        )}
      </motion.div>
    </div>
  )
}
