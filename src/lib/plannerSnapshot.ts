/**
 * Lit les métadonnées optionnelles du planner (snapshot JSON) pour une tâche,
 * alignée sur l’ordre des tâches en base (created_at asc).
 */
export function getPlannerTaskAtIndex(
  snapshot: unknown,
  index: number
): Record<string, unknown> | null {
  if (snapshot == null || typeof snapshot !== 'object') return null
  const raw = snapshot as { tasks?: unknown }
  const arr = raw.tasks
  if (!Array.isArray(arr) || index < 0 || index >= arr.length) return null
  const t = arr[index]
  if (!t || typeof t !== 'object') return null
  return t as Record<string, unknown>
}

/** Texte d’aide détaillée si le planner l’a fourni (nouvelles missions). */
export function extractGuidanceFromPlannerTask(
  raw: Record<string, unknown> | null
): string | null {
  if (!raw) return null
  const keys = ['guidance', 'detailed_help', 'aide', 'help', 'how_to', 'tips']
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  const steps = raw.steps
  if (Array.isArray(steps)) {
    const lines = steps
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .map((s) => `• ${s.trim()}`)
      .join('\n')
    if (lines.trim()) return lines
  }
  return null
}

export function buildFallbackGuidance(objective: string, description: string): string {
  const parts: string[] = [
    'Comment avancer sur cette étape',
    '',
    '• Relis la description de la tâche et note le livrable attendu.',
    '• Identifie les infos ou documents dont tu as besoin avant de commencer.',
    '• Découpe le travail en 2–3 micro-actions (recherche, synthèse, validation).',
    '• Quand c’est fait, coche « Marquer comme fait » pour suivre ta progression.',
  ]
  if (objective.trim()) {
    parts.splice(
      3,
      0,
      `• Rappel objectif global : ${objective.trim().slice(0, 280)}${objective.length > 280 ? '…' : ''}`
    )
  }
  if (description.trim()) {
    parts.push('')
    parts.push('À partir de la description :')
    parts.push(description.trim())
  }
  return parts.join('\n')
}
