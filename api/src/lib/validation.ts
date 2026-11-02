import type { Context } from 'hono'
import { badRequest, unprocessable } from './errors'

/** Read the JSON body. Bad or non-object JSON -> 400, never a crash. */
export async function readJsonObject(c: Context): Promise<Record<string, unknown>> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw badRequest('Request body must be valid JSON')
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw badRequest('Request body must be a JSON object')
  }
  return body as Record<string, unknown>
}

const MAX_TEXT = 200

/** A required, non-blank string (trimmed, max 200 chars). */
export function requireText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw unprocessable(`${field} must be a non-empty string`)
  }
  const trimmed = value.trim()
  if (trimmed.length > MAX_TEXT) {
    throw unprocessable(`${field} must be at most ${MAX_TEXT} characters`)
  }
  return trimmed
}

/** Positive whole number of cents. Rejects 0, negatives, decimals, strings, NaN, huge values. */
export function requirePositiveCents(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw unprocessable(`${field} must be a positive whole number of cents`)
  }
  return value
}
