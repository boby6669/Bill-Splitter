import { useCallback, useEffect, useRef, useState } from 'react'

export type Resource<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T }

/**
 * Load data on mount and whenever `key` changes.
 * `retry()` shows the loading state again; `reload()` refreshes quietly in the background.
 */
export function useResource<T>(load: () => Promise<T>, key: string) {
  const [state, setState] = useState<Resource<T>>({ status: 'loading' })
  const loadRef = useRef(load)
  loadRef.current = load

  const run = useCallback(async (showLoading: boolean) => {
    if (showLoading) setState({ status: 'loading' })
    try {
      setState({ status: 'success', data: await loadRef.current() })
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
    }
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` is the "reload now" signal
  useEffect(() => {
    void run(true)
  }, [run, key])

  return { state, retry: () => run(true), reload: () => run(false) }
}
