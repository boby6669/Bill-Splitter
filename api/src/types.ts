export type Bindings = { DB: D1Database }
export type AppEnv = { Bindings: Bindings }

export type Home = { id: string; name: string }
export type Member = { id: string; homeId: string; name: string }
export type Share = {
  id: string
  memberId: string
  amountCents: number
  paidAt: string | null
}
