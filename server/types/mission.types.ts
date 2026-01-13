export interface Task {
  id: string
  title: string
  description: string
  status: 'planned' | 'in_progress' | 'completed'
  agent: string
  reasoning?: string
  result?: string
  dependencies?: string[]
}

export interface Mission {
  id: string
  objective: string
  tasks: Task[]
  status: 'planning' | 'executing' | 'completed'
  createdAt: string
}
