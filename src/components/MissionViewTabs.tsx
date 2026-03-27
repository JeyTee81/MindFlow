export type MissionWorkspaceTab = 'parcours' | 'calendar' | 'today' | 'graph'

const TABS: { id: MissionWorkspaceTab; label: string; hint: string }[] = [
  { id: 'parcours', label: 'Parcours', hint: 'Grandes étapes' },
  { id: 'calendar', label: 'Calendrier', hint: '~3 tâches / jour' },
  { id: 'today', label: 'Aujourd’hui', hint: 'NBA & debrief' },
  { id: 'graph', label: 'Graphe', hint: 'Vue technique' },
]

type Props = {
  active: MissionWorkspaceTab
  onChange: (tab: MissionWorkspaceTab) => void
}

export default function MissionViewTabs({ active, onChange }: Props) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-blue-500/20 bg-night-blue/90 px-2 py-2">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          title={t.hint}
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm ${
            active === t.id
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
