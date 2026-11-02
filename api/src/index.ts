import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ApiError } from './lib/errors'
import { balances } from './routes/balances'
import { bills } from './routes/bills'
import { homes } from './routes/homes'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

app.use('/api/*', cors())

app.get('/api/health', (c) => c.json({ status: 'ok' }))
app.route('/api/homes', homes)
app.route('/api', bills)
app.route('/api', balances)

// Every error leaves the API as { "error": "message" }.
app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  if (err instanceof ApiError) return c.json({ error: err.message }, err.status)
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
