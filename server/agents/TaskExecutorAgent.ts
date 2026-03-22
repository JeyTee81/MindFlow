import { createMistralClient, MISTRAL_MODEL } from './mistralClient.js'

const SYSTEM_PROMPT = `You are a Task Executor Agent. Your role is to execute specific tasks and provide detailed reasoning for your actions.

When given a task, you must:
1. Understand the task requirements
2. Execute the task (generate content, create plans, write code, etc.)
3. Provide clear reasoning for your approach
4. Return actionable results

Your response should include:
- Reasoning: Your thought process and approach
- Result: The actual output or completion status
- Next steps: What should happen next

Be thorough, practical, and explain your reasoning clearly.`

export class TaskExecutorAgent {
  private client: ReturnType<typeof createMistralClient>

  constructor() {
    this.client = createMistralClient()
  }

  async executeTask(
    taskTitle: string,
    taskDescription: string,
    context?: string
  ): Promise<{
    reasoning: string
    result: string
    nextSteps: string
  }> {
    try {
      const contextText = context
        ? `\n\nContext from previous tasks:\n${context}`
        : ''

      const response = await this.client.chat.completions.create({
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Task: ${taskTitle}\nDescription: ${taskDescription}${contextText}`,
          },
        ],
        temperature: 0.7,
      })

      const content = response.choices[0]?.message?.content || ''
      
      return {
        reasoning: this.extractReasoning(content),
        result: this.extractResult(content),
        nextSteps: this.extractNextSteps(content),
      }
    } catch (error) {
      console.error('TaskExecutorAgent error:', error)
      throw error
    }
  }

  private extractReasoning(content: string): string {
    const reasoningMatch = content.match(/Reasoning:?\s*(.+?)(?=Result:|$)/is)
    return reasoningMatch ? reasoningMatch[1].trim() : content
  }

  private extractResult(content: string): string {
    const resultMatch = content.match(/Result:?\s*(.+?)(?=Next steps:|$)/is)
    return resultMatch ? resultMatch[1].trim() : 'Task completed'
  }

  private extractNextSteps(content: string): string {
    const nextMatch = content.match(/Next steps:?\s*(.+?)$/is)
    return nextMatch ? nextMatch[1].trim() : 'Continue with next task'
  }
}
