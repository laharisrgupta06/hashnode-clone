import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

// Loads data for a page and tracks loading / success / error.
//   const { status, data, error, reload } = useRequest((signal) => api.get('/tags', { signal }).then((r) => r.data), []);
// - When `deps` change (e.g. the search term), the previous request is CANCELLED, so a slow old
//   response can never overwrite newer results.
// - While reloading, the previous data stays visible (no flashing empty page).
// - reload() repeats the request (for "Try again" buttons).
export default function useRequest(fetcher, deps) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, status: 'loading', error: null }));

    fetcher(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted || axios.isCancel(error)) return;
        setState({ status: 'error', data: null, error });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass their own dependency list
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  // Lets a page update its local copy after a change (e.g. remove a deleted post) without refetching.
  const setData = useCallback((update) => setState((current) => ({ ...current, data: typeof update === 'function' ? update(current.data) : update })), []);

  return { ...state, reload, setData };
}
