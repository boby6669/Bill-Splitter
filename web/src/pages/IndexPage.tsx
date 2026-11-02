import { useNavigate } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import { api } from '../lib/api'

export function IndexPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const home = await api.createHome(name)
      await navigate({ to: '/homes/$homeId', params: { homeId: home.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create home')
      setPending(false)
    }
  }

  return (
    <main>
      <h1>Split the bills at home</h1>
      <p className="lede">
        Create a home, add the people who live there, then split each bill evenly.
      </p>
      <form onSubmit={submit} className="row">
        <label>
          Home name
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
        </label>
        <button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create home'}
        </button>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
  )
}
