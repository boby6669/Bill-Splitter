export type Member = { id: string; homeId: string; name: string }
export type HomeDetail = { id: string; name: string; members: Member[] }
export type BillShare = {
  id: string
  memberId: string
  memberName: string
  amountCents: number
  paidAt: string | null
}
export type Bill = {
  id: string
  homeId: string
  title: string
  totalCents: number
  shares: BillShare[]
}
export type Balance = { memberId: string; name: string; outstandingCents: number }

const TIMEOUT_MS = 10_000

/** Any failure the UI should show as a message: API error, network error, or timeout. */
export class ApiClientError extends Error {}

/**
 * One place for every request. It never throws anything except ApiClientError,
 * so the screens only need to handle one kind of error.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`/api${path}`, { ...init, signal: controller.signal })
    const text = await res.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      // A 500 page that is not JSON: fall through to the generic message below.
    }
    if (!res.ok) {
      const message =
        typeof data === 'object' && data !== null && 'error' in data
          ? String((data as { error: unknown }).error)
          : `Server error (${res.status})`
      throw new ApiClientError(message)
    }
    return data as T
  } catch (err) {
    if (err instanceof ApiClientError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiClientError('The server took too long to answer. Try again.')
    }
    throw new ApiClientError('Could not reach the server. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
  }
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  createHome: (name: string) => request<{ id: string; name: string }>('/homes', json({ name })),
  getHome: (homeId: string) => request<HomeDetail>(`/homes/${homeId}`),
  addMember: (homeId: string, name: string) =>
    request<Member>(`/homes/${homeId}/members`, json({ name })),
  listBills: (homeId: string) => request<{ bills: Bill[] }>(`/homes/${homeId}/bills`),
  createBill: (homeId: string, title: string, totalCents: number) =>
    request<Bill>(`/homes/${homeId}/bills`, json({ title, totalCents })),
  getBalances: (homeId: string) => request<{ balances: Balance[] }>(`/homes/${homeId}/balances`),
  payShare: (billId: string, shareId: string, idempotencyKey: string) =>
    request<{ id: string; paidAt: string }>(`/bills/${billId}/shares/${shareId}/pay`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
}

export const formatCents = (cents: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

/** "12.50" -> 1250. Returns null for anything that is not a positive amount with at most 2 decimals. */
export function parseDollarsToCents(input: string): number | null {
  const match = /^\s*(\d+)(?:\.(\d{1,2}))?\s*$/.exec(input)
  if (!match) return null
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null
}
