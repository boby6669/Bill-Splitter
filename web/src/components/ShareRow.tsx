import { useRef, useState } from 'react'
import { api, type BillShare, formatCents } from '../lib/api'

type Props = { billId: string; share: BillShare; onPaid: () => void }

export function ShareRow({ billId, share, onPaid }: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // One key per "payment attempt". A retry after a failure re-uses it, so a request that
  // actually reached the server but whose answer got lost can never pay twice.
  const keyRef = useRef<string | null>(null)

  async function pay() {
    if (pending) return
    keyRef.current ??= crypto.randomUUID()
    setPending(true)
    setError(null)
    try {
      await api.payShare(billId, share.id, keyRef.current)
      keyRef.current = null
      onPaid()
    } catch (err) {
      // The share stays unpaid on screen; we only show why.
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <li className="share">
      <span className="share-name">{share.memberName}</span>
      <span className="amount">{formatCents(share.amountCents)}</span>
      {share.paidAt ? (
        <span className="paid">Paid</span>
      ) : (
        <button type="button" onClick={pay} disabled={pending}>
          {pending ? 'Paying…' : 'Pay share'}
        </button>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}
