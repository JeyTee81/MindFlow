import type { Request } from 'express'
import { getSupabaseAnon } from '../supabaseAdmin.js'

export async function getUserIdFromRequest(req: Request): Promise<string> {
  const authHeader = req.header('Authorization')
  if (!authHeader) {
    throw new Error('Missing Authorization header')
  }

  const [scheme, token] = authHeader.split(' ')
  if (scheme !== 'Bearer' || !token) {
    throw new Error('Invalid Authorization header')
  }

  const { data, error } = await getSupabaseAnon().auth.getUser(token)
  if (error) throw error
  if (!data.user) throw new Error('User not found')

  return data.user.id
}

