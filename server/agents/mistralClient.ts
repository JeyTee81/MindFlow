import OpenAI from 'openai'

/** Mistral utilise une API compatible OpenAI (chat completions). */
const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1'

export function createMistralClient(): OpenAI {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) {
    throw new Error('Missing MISTRAL_API_KEY env var')
  }
  return new OpenAI({
    apiKey,
    baseURL: MISTRAL_BASE_URL,
  })
}

export const MISTRAL_MODEL =
  process.env.MISTRAL_MODEL?.trim() || 'mistral-small-latest'
