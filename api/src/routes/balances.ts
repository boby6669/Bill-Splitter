import { Hono } from 'hono'
import { notFound } from '../lib/errors'
import type { AppEnv } from '../types'

export const balances = new Hono<AppEnv>()

balances.get('/homes/:homeId/balances', async (c) => {
  const homeId = c.req.param('homeId')
  const db = c.env.DB
  const home = await db.prepare('SELECT id FROM homes WHERE id = ?').bind(homeId).first()
  if (!home) throw notFound('Home not found')

  // LEFT JOIN so a member with no shares still shows up with 0.
  const { results } = await db
    .prepare(
      `SELECT m.id AS member_id, m.name,
              COALESCE(SUM(CASE WHEN s.paid_at IS NULL THEN s.amount_cents END), 0) AS outstanding
       FROM members m
       LEFT JOIN shares s ON s.member_id = m.id
       WHERE m.home_id = ?
       GROUP BY m.id
       ORDER BY m.position`,
    )
    .bind(homeId)
    .all<{ member_id: string; name: string; outstanding: number }>()

  return c.json({
    balances: results.map((r) => ({
      memberId: r.member_id,
      name: r.name,
      outstandingCents: r.outstanding,
    })),
  })
})
