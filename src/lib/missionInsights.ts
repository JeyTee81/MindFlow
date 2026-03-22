import type { Task } from '../store/useMissionStore'

/**
 * Tâche considérée comme « faite » pour le déblocage des suivantes (NBA, calendrier, debrief).
 * Uniquement la validation utilisateur — pas le statut IA (`completed`), pour éviter toute
 * avancée « automatique » sans clic explicite.
 */
export function isTaskDoneForFlow(t: Task): boolean {
  return Boolean(t.userValidated)
}

/**
 * Prochaine action recommandée : dépendances satisfaites, pas terminée ;
 * priorité à `in_progress`, sinon première tâche éligible (ordre liste = ordre planner).
 */
export function findNextBestTask(tasks: Task[]): Task | null {
  if (tasks.length === 0) return null
  const byId = new Map(tasks.map((t) => [t.id, t]))

  const candidates = tasks.filter((t) => {
    if (isTaskDoneForFlow(t)) return false
    const deps = t.dependencies || []
    return deps.every((d) => {
      const dep = byId.get(d)
      return dep != null && isTaskDoneForFlow(dep)
    })
  })
  if (candidates.length === 0) return null

  const inProgress = candidates.find((t) => t.status === 'in_progress')
  if (inProgress) return inProgress
  return candidates[0]
}

export function toYmdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDaysLocal(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Début du plan = jour de création de la mission (local). */
export function missionAnchorYmd(createdAtIso: string): string {
  return toYmdLocal(new Date(createdAtIso))
}

/**
 * Répartition automatique : ordre des tâches = ordre planner (tableau),
 * N tâches par jour civile à partir du jour d’ancrage.
 */
export function buildTaskDaySchedule(
  tasks: Task[],
  anchorYmd: string,
  tasksPerDay = 3
): Map<string, string> {
  const map = new Map<string, string>()
  const start = parseYmdLocal(anchorYmd)
  tasks.forEach((t, i) => {
    const dayOffset = Math.floor(i / tasksPerDay)
    map.set(t.id, toYmdLocal(addDaysLocal(start, dayOffset)))
  })
  return map
}

export type DailyDebrief = {
  dateLabel: string
  /** Résumé court */
  summary: string
  /** Points détaillés */
  bullets: string[]
}

/**
 * Debrief « intelligent » sans appel IA : règles lisibles (MVP).
 * Peut être enrichi plus tard par une Edge Function Mistral.
 */
export function buildDailyDebrief(
  missionObjective: string,
  tasks: Task[],
  anchorYmd: string,
  todayYmd: string,
  tasksPerDay = 3
): DailyDebrief {
  const schedule = buildTaskDaySchedule(tasks, anchorYmd, tasksPerDay)
  const todayTasks = tasks.filter((t) => schedule.get(t.id) === todayYmd)

  const done = (t: Task) => isTaskDoneForFlow(t)
  const doneToday = todayTasks.filter(done)
  const pendingToday = todayTasks.filter((t) => !done(t))

  const nba = findNextBestTask(tasks)
  const dateLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseYmdLocal(todayYmd))

  const bullets: string[] = []

  if (todayTasks.length === 0) {
    bullets.push(
      'Aucune tâche assignée à cette date dans le planning automatique (réparties sur d’autres jours).'
    )
    bullets.push(
      'Tu peux quand même avancer : utilise « Prochaine action recommandée » pour la prochaine étape logique du graphe.'
    )
  } else {
    bullets.push(
      `Pour aujourd’hui, le plan prévoit ${todayTasks.length} tâche(s) : ${doneToday.length} déjà cochée(s) par toi, ${pendingToday.length} encore à faire.`
    )
    if (pendingToday.length > 0) {
      bullets.push(
        `À traiter : ${pendingToday.map((t) => t.title).slice(0, 4).join(' · ')}${pendingToday.length > 4 ? '…' : ''}`
      )
    }
    if (doneToday.length > 0) {
      bullets.push(`Bien joué sur : ${doneToday.map((t) => t.title).slice(0, 4).join(' · ')}${doneToday.length > 4 ? '…' : ''}`)
    }
  }

  if (nba && !isTaskDoneForFlow(nba)) {
    bullets.push(`Prochaine action recommandée du graphe : « ${nba.title} ».`)
  }

  const allDone = tasks.length > 0 && tasks.every(done)
  let summary = `Objectif du projet : ${missionObjective.slice(0, 120)}${missionObjective.length > 120 ? '…' : ''}`
  if (allDone) {
    summary =
      'Toutes les étapes sont cochées (validation perso). Tu peux clôturer le sujet ou lancer une mission de suivi si besoin.'
  } else if (pendingToday.length === 0 && todayTasks.length > 0) {
    summary = 'Journée prévue : tout ce qui était planifié pour aujourd’hui est coché. Tu peux enchaîner sur la prochaine action ou anticiper demain.'
  } else if (pendingToday.length > 0) {
    summary = `Il reste du travail aujourd’hui : priorise les tâches prévues, puis la prochaine action recommandée.`
  } else {
    summary = `Aujourd’hui : focus sur l’avancement global du projet.`
  }

  return { dateLabel, summary, bullets }
}

/** Regroupe les tâches par date YYYY-MM-DD pour affichage calendrier. */
export function groupTasksByScheduledDay(
  tasks: Task[],
  anchorYmd: string,
  tasksPerDay = 3
): Map<string, Task[]> {
  const schedule = buildTaskDaySchedule(tasks, anchorYmd, tasksPerDay)
  const byDay = new Map<string, Task[]>()
  for (const t of tasks) {
    const ymd = schedule.get(t.id) ?? anchorYmd
    const list = byDay.get(ymd) ?? []
    list.push(t)
    byDay.set(ymd, list)
  }
  return byDay
}

export function sortedDayKeys(ymdKeys: string[]): string[] {
  return [...ymdKeys].sort()
}
