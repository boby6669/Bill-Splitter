import { Link, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { AddBillForm, AddMemberForm } from '../components/AddForms'
import { Balances } from '../components/Balances'
import { BillList } from '../components/BillList'
import { ErrorState, Loading } from '../components/StateViews'
import { api } from '../lib/api'
import { useResource } from '../lib/useResource'

export function HomePage() {
  const { homeId } = useParams({ from: '/homes/$homeId' })
  // Bumping `version` makes the bills, balances and members reload after any change.
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  const { state, retry } = useResource(() => api.getHome(homeId), `${homeId}:${version}`)

  return (
    <main>
      <Link to="/" className="back">
        All homes
      </Link>
      {state.status === 'loading' && <Loading label="Loading home…" />}
      {state.status === 'error' && <ErrorState message={state.message} onRetry={retry} />}
      {state.status === 'success' && (
        <>
          <h1>{state.data.name}</h1>
          <section>
            <h2>Members</h2>
            <p className="members-line">
              {state.data.members.length === 0
                ? 'No members yet. Bills need at least one member.'
                : state.data.members.map((m) => m.name).join(', ')}
            </p>
            <AddMemberForm homeId={homeId} onChange={refresh} />
          </section>
          <section>
            <h2>Who owes what</h2>
            <Balances homeId={homeId} version={version} />
          </section>
          <section>
            <h2>Bills</h2>
            <AddBillForm homeId={homeId} onChange={refresh} />
            <BillList homeId={homeId} version={version} onChange={refresh} />
          </section>
        </>
      )}
    </main>
  )
}
