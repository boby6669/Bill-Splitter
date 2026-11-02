import { api, formatCents } from '../lib/api'
import { useResource } from '../lib/useResource'
import { EmptyState, ErrorState, Loading } from './StateViews'

export function Balances({ homeId, version }: { homeId: string; version: number }) {
  const { state, retry } = useResource(
    async () => (await api.getBalances(homeId)).balances,
    `${homeId}:${version}`,
  )

  if (state.status === 'loading') return <Loading label="Loading balances…" />
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={retry} />
  if (state.data.length === 0) return <EmptyState>Add a member to see balances.</EmptyState>

  return (
    <ul className="balances">
      {state.data.map((b) => (
        <li key={b.memberId}>
          <span>{b.name}</span>
          <span className="amount">{formatCents(b.outstandingCents)} owed</span>
        </li>
      ))}
    </ul>
  )
}
