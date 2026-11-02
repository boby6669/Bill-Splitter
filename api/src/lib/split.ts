/**
 * Split `totalCents` between `count` people. Pure function, no database.
 *
 * Everyone gets floor(total / count). The leftover cents (total % count) are
 * given out one by one to the first people in the list.
 * Example: split(1000, 3) -> [334, 333, 333]. The sum always equals totalCents.
 */
export function splitCents(totalCents: number, count: number): number[] {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
    throw new RangeError('totalCents must be a non-negative integer')
  }
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new RangeError('count must be a positive integer')
  }
  const base = Math.floor(totalCents / count)
  const remainder = totalCents % count
  return Array.from({ length: count }, (_, i) => (i < remainder ? base + 1 : base))
}
