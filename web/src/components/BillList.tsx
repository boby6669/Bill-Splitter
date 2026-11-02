import { api, formatCents } from '../lib/api'
import { useResource } from '../lib/useResource'
import { ShareRow } from './ShareRow'
import { EmptyState, ErrorState, Loading } from './StateViews'

type Props = { homeId: string; version: number; onChange: () => void }

export function BillList({ homeId, version, onChange }: Props) {
  const { state, retry } = useResource(
    async () => (await api.listBills(homeId)).bills,
    `${homeId}:${version}`,
  )

  if (state.status === 'loading') return <Loading label="Loading bills…" />
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={retry} />
  if (state.data.length === 0) {
    return <EmptyState>No bills yet. Add the first one above.</EmptyState>
  }

  return (
    <div className="bills">
      {state.data.map((bill) => (
        <article key={bill.id} className="bill">
          <header>
            <h3>{bill.title}</h3>
            <span className="amount">{formatCents(bill.totalCents)}</span>
          </header>
          <ul>
            {bill.shares.map((share) => (
              <ShareRow key={share.id} billId={bill.id} share={share} onPaid={onChange} />
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}
