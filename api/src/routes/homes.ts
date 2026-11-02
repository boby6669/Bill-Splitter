import { Hono } from 'hono'
import { notFound } from '../lib/errors'
import { readJsonObject, requireText } from '../lib/validation'
import type { AppEnv, Home, Member } from '../types'

export const homes = new Hono<AppEnv>()

type HomeRow = { id: string; name: string }
type MemberRow = { id: string; home_id: string; name: string }

/** Create a home. */
homes.post('/', async (c) => {
  const body = await readJsonObject(c)
  const name = requireText(body.name, 'name')
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO homes (id, name) VALUES (?, ?)').bind(id, name).run()
  const home: Home = { id, name }
  return c.json(home, 201)
})

/** Extra (not in the task): read one home with its members. The web page uses it. */
homes.get('/:homeId', async (c) => {
  const homeId = c.req.param('homeId')
  const home = await c.env.DB.prepare('SELECT id, name FROM homes WHERE id = ?')
    .bind(homeId)
    .first<HomeRow>()
  if (!home) throw notFound('Home not found')
  const { results } = await c.env.DB.prepare(
    'SELECT id, home_id, name FROM members WHERE home_id = ? ORDER BY position',
  )
    .bind(homeId)
    .all<MemberRow>()
  const members: Member[] = results.map((m) => ({ id: m.id, homeId: m.home_id, name: m.name }))
  return c.json({ id: home.id, name: home.name, members })
})

/** Add a member to a home. */
homes.post('/:homeId/members', async (c) => {
  const homeId = c.req.param('homeId')
  const home = await c.env.DB.prepare('SELECT id FROM homes WHERE id = ?').bind(homeId).first()
  if (!home) throw notFound('Home not found')

  const body = await readJsonObject(c)
  const name = requireText(body.name, 'name')
  const id = crypto.randomUUID()

  // ONE statement picks the next position and inserts. D1 runs one statement at a time,
  // so two requests can never get the same position. UNIQUE(home_id, position) is the safety net.
  await c.env.DB.prepare(
    `INSERT INTO members (id, home_id, name, position)
     SELECT ?1, ?2, ?3, COALESCE(MAX(position), 0) + 1 FROM members WHERE home_id = ?2`,
  )
    .bind(id, homeId, name)
    .run()

  const member: Member = { id, homeId, name }
  return c.json(member, 201)
})
