/** Quota gratuit : nombre de générations de plan (planner) par mois civil (UTC). */
export const FREE_MONTHLY_AI_RUNS = 10

/** Mois courant pour le quota (UTC, aligné avec l’Edge Function create-mission). */
export function currentQuotaMonthIso(): string {
  return new Date().toISOString().slice(0, 7)
}

export function effectiveAiRunsUsed(profile: {
  ai_runs_used: number
  ai_quota_month: string | null
}): number {
  if (profile.ai_quota_month !== currentQuotaMonthIso()) return 0
  return profile.ai_runs_used
}

export function freePlannerRunsRemaining(profile: {
  subscription_tier: 'free' | 'premium'
  ai_runs_used: number
  ai_quota_month: string | null
}): number | null {
  if (profile.subscription_tier === 'premium') return null
  const used = effectiveAiRunsUsed(profile)
  return Math.max(0, FREE_MONTHLY_AI_RUNS - used)
}
