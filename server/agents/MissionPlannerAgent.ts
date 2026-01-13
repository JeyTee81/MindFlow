import OpenAI from 'openai'

const SYSTEM_PROMPT = `You are a Mission Planner Agent. Your role is to break down high-level objectives into structured, actionable tasks.

When given an objective, you must:
1. Analyze the objective thoroughly
2. Break it down into 5-10 specific, sequential tasks
3. Identify dependencies between tasks
4. Assign each task to the appropriate agent (TaskExecutor or Analyst)
5. Provide clear descriptions for each task

Return your response as a JSON object with a "tasks" array:
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Detailed description",
      "agent": "TaskExecutor" or "Analyst",
      "dependencies": [] or ["index-0", "index-1"] (use task indices)
    }
  ]
}

Be specific, actionable, and ensure tasks are logically ordered.`

export class MissionPlannerAgent {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async planMission(objective: string): Promise<Array<{
    title: string
    description: string
    agent: string
    dependencies: string[]
  }>> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Objective: ${objective}` },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      })

      const content = response.choices[0]?.message?.content
      if (!content) throw new Error('No response from OpenAI')

      const parsed = JSON.parse(content)
      const tasks = parsed.tasks || parsed
      return Array.isArray(tasks) ? tasks : []
    } catch (error) {
      console.error('MissionPlannerAgent error:', error)
      throw error
    }
  }
}
