import { createMistralClient, MISTRAL_MODEL } from './mistralClient.js'

const SYSTEM_PROMPT = `You are an Analyst Agent. Your role is to analyze mission progress, identify improvements, and suggest iterations.

When analyzing a mission, you must:
1. Review completed tasks and their results
2. Assess overall progress toward the objective
3. Identify gaps or areas for improvement
4. Suggest new tasks or modifications if needed
5. Provide strategic insights

Your response should include:
- Progress Analysis: Current state assessment
- Gaps Identified: What's missing or needs improvement
- Recommendations: Specific suggestions for next steps
- Strategic Insights: High-level observations

Be analytical, constructive, and forward-thinking.`

export class AnalystAgent {
  private client: ReturnType<typeof createMistralClient>

  constructor() {
    this.client = createMistralClient()
  }

  async analyzeProgress(
    objective: string,
    completedTasks: Array<{
      title: string
      description: string
      result?: string
    }>,
    inProgressTasks: Array<{ title: string; description: string }>
  ): Promise<{
    analysis: string
    gaps: string[]
    recommendations: string[]
    insights: string
  }> {
    try {
      const completedText = completedTasks
        .map((t) => `- ${t.title}: ${t.result || 'Completed'}`)
        .join('\n')
      const inProgressText = inProgressTasks
        .map((t) => `- ${t.title}`)
        .join('\n')

      const response = await this.client.chat.completions.create({
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Objective: ${objective}\n\nCompleted Tasks:\n${completedText}\n\nIn Progress:\n${inProgressText}\n\nAnalyze the progress and provide recommendations.`,
          },
        ],
        temperature: 0.7,
      })

      const content = response.choices[0]?.message?.content || ''

      return {
        analysis: this.extractSection(content, 'Progress Analysis'),
        gaps: this.extractList(content, 'Gaps Identified'),
        recommendations: this.extractList(content, 'Recommendations'),
        insights: this.extractSection(content, 'Strategic Insights'),
      }
    } catch (error) {
      console.error('AnalystAgent error:', error)
      throw error
    }
  }

  private extractSection(content: string, sectionName: string): string {
    const regex = new RegExp(`${sectionName}:?\\s*(.+?)(?=\\n[A-Z][^:]+:|$)`, 'is')
    const match = content.match(regex)
    return match ? match[1].trim() : ''
  }

  private extractList(content: string, sectionName: string): string[] {
    const section = this.extractSection(content, sectionName)
    return section
      .split('\n')
      .filter((line) => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
      .map((line) => line.replace(/^[-•]\s*|\d+\.\s*/, '').trim())
      .filter((line) => line.length > 0)
  }
}
