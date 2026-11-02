import { type FormEvent, useState } from 'react'
import { api, parseDollarsToCents } from '../lib/api'

type Props = { homeId: string; onChange: () => void }

export function AddMemberForm({ homeId, onChange }: Props) {
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await api.addMember(homeId, name)
      setName('')
      onChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add member')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="row">
      <label>
        Member name
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add member'}
      </button>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

export function AddBillForm({ homeId, onChange }: Props) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseDollarsToCents(amount)
    if (cents === null) {
      setError('Enter an amount like 42 or 42.50')
      return
    }
    setPending(true)
    setError(null)
    try {
      await api.createBill(homeId, title, cents)
      setTitle('')
      setAmount('')
      onChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add bill')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="row">
      <label>
        Bill title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </label>
      <label>
        Total (USD)
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          required
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add bill'}
      </button>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
