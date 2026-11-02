import { Hono } from 'hono'
import { badRequest, conflict, notFound, unprocessable } from '../lib/errors'
import { splitCents } from '../lib/split'
import { readJsonObject, requirePositiveCents, requireText } from '../lib/validation'
import type { AppEnv, Share } from '../types'

export const bills = new Hono<AppEnv>()

type ShareRow = {
  id: string
  member_id: string
  amount_cents: number
  paid_at: string | null
  idempotency_key: string | null
}

const toShare = (r: ShareRow): Share => ({
  id: r.id,
  memberId: r.member_id,
  amountCents: r.amount_cents,
  paidAt: r.paid_at,
})

/** Create a bill and split it between all members of the home. */
bills.post('/homes/:homeId/bills', async (c) => {
  const homeId = c.req.param('homeId')
  const db = c.env.DB

  const home = await db.prepare('SELECT id FROM homes WHERE id = ?').bind(homeId).first()
  if (!home) throw notFound('Home not found')

  const body = await readJsonObject(c)
  const title = requireText(body.title, 'title')
  const totalCents = requirePositiveCents(body.totalCents, 'totalCents')

  const { results: members } = await db
    .prepare('SELECT id FROM members WHERE home_id = ? ORDER BY position')
    .bind(homeId)
    .all<{ id: string }>()
  if (members.length === 0) throw unprocessable('Home has no members')

  const amounts = splitCents(totalCents, members.length)
  const billId = crypto.randomUUID()
  const shares: Share[] = members.map((m, i) => ({
    id: crypto.randomUUID(),
    memberId: m.id,
    amountCents: amounts[i] ?? 0,
    paidAt: null,
  }))

  // db.batch() runs all statements in ONE transaction: the bill and all its shares
  // are saved together, or nothing is saved.
  await db.batch([
    db
      .prepare('INSERT INTO bills (id, home_id, title, total_cents) VALUES (?, ?, ?, ?)')
      .bind(billId, homeId, title, totalCents),
    ...shares.map((s) =>
      db
        .prepare('INSERT INTO shares (id, bill_id, member_id, amount_cents) VALUES (?, ?, ?, ?)')
        .bind(s.id, billId, s.memberId, s.amountCents),
    ),
  ])

  return c.json({ id: billId, homeId, title, totalCents, shares }, 201)
})

/** Extra (not in the task): list the bills of a home with their shares. The web page uses it. */
bills.get('/homes/:homeId/bills', async (c) => {
  const homeId = c.req.param('homeId')
  const db = c.env.DB
  const home = await db.prepare('SELECT id FROM homes WHERE id = ?').bind(homeId).first()
  if (!home) throw notFound('Home not found')

  const { results: billRows } = await db
    .prepare(
      `SELECT id, title, total_cents FROM bills WHERE home_id = ? ORDER BY created_at DESC, rowid DESC`,
    )
    .bind(homeId)
    .all<{ id: string; title: string; total_cents: number }>()

  const { results: shareRows } = await db
    .prepare(
      `SELECT s.id, s.bill_id, s.member_id, s.amount_cents, s.paid_at, m.name AS member_name
       FROM shares s
       JOIN bills b ON b.id = s.bill_id
       JOIN members m ON m.id = s.member_id
       WHERE b.home_id = ?
       ORDER BY m.position`,
    )
    .bind(homeId)
    .all<{
      id: string
      bill_id: string
      member_id: string
      amount_cents: number
      paid_at: string | null
      member_name: string
    }>()

  const result = billRows.map((b) => ({
    id: b.id,
    homeId,
    title: b.title,
    totalCents: b.total_cents,
    shares: shareRows
      .filter((s) => s.bill_id === b.id)
      .map((s) => ({
        id: s.id,
        memberId: s.member_id,
        memberName: s.member_name,
        amountCents: s.amount_cents,
        paidAt: s.paid_at,
      })),
  }))
  return c.json({ bills: result })
})

/** Pay one share. Safe to retry (idempotent) and safe against two requests at once. */
bills.post('/bills/:billId/shares/:shareId/pay', async (c) => {
  const { billId, shareId } = c.req.param()
  const db = c.env.DB

  const key = c.req.header('Idempotency-Key')?.trim()
  if (!key) throw badRequest('Idempotency-Key header is required')
  if (key.length > 255) throw badRequest('Idempotency-Key is too long')

  // ONE atomic statement: "mark as paid, but only if it is still unpaid".
  // If two requests arrive together, the database lets only one of them change the row.
  const update = await db
    .prepare(
      `UPDATE shares SET paid_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), idempotency_key = ?
       WHERE id = ? AND bill_id = ? AND paid_at IS NULL`,
    )
    .bind(key, shareId, billId)
    .run()

  const row = await db
    .prepare(
      'SELECT id, member_id, amount_cents, paid_at, idempotency_key FROM shares WHERE id = ? AND bill_id = ?',
    )
    .bind(shareId, billId)
    .first<ShareRow>()
  if (!row) throw notFound('Bill or share not found')

  const weJustPaidIt = update.meta.changes === 1
  const sameKeyRetry = row.idempotency_key === key
  if (!weJustPaidIt && !sameKeyRetry) throw conflict('Share is already paid')

  return c.json(toShare(row), 200)
})
