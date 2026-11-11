import { createContext, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import api, { getToken, setToken, clearToken, setUnauthorizedHandler } from '../api/axios.js';

export const AuthContext = createContext(null);

// Holds who is logged in for the whole app (read it with the useAuth hook).
//
// status is one of:
//   'loading'     - a token is stored and we are asking the server whether it is still valid
//   'authenticated' - the server confirmed the token; `user` is set
//   'guest'       - nobody is logged in
//   'unavailable' - we could not reach the server to check (network error, timeout, 5xx).
//                   The stored token is KEPT: not being able to verify is not the same as being logged out.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => getToken());
  const [status, setStatus] = useState(() => (getToken() ? 'loading' : 'guest'));
  // true after a session ended because the server rejected the token (expired, tampered, user deleted...)
  const [sessionExpired, setSessionExpired] = useState(false);

  // Counts "session changes" and token checks. A check that finished after the session changed
  // (user logged in or out meanwhile, or Retry was clicked again) is stale and must be ignored.
  const sessionVersion = useRef(0);

  const startSession = useCallback((newToken, newUser) => {
    sessionVersion.current += 1;
    setToken(newToken); // saved first, so the very next request already carries it
    setTokenState(newToken);
    setUser(newUser);
    setStatus('authenticated');
    setSessionExpired(false);
  }, []);

  const endSession = useCallback((expired) => {
    sessionVersion.current += 1;
    clearToken(); // clears localStorage AND the in-memory fallback
    setTokenState(null);
    setUser(null);
    setStatus('guest');
    setSessionExpired(expired);
  }, []);

  // Asks the server "is my stored token still good, and who am I?". Used on startup and by Retry.
  // This request has skipAuthHandler: a 401 here is handled right below, not by the global handler.
  const verifySession = useCallback(async () => {
    const storedToken = getToken();
    if (!storedToken) {
      setStatus('guest');
      return;
    }

    const version = ++sessionVersion.current;
    setStatus('loading');
    try {
      const { data } = await api.get('/auth/me', { skipAuthHandler: true });
      if (version !== sessionVersion.current) return; // stale result, the session changed meanwhile
      setUser(data.user);
      setTokenState(storedToken);
      setStatus('authenticated');
    } catch (error) {
      if (version !== sessionVersion.current) return;
      if (error.response?.status === 401) {
        endSession(true); // the server says this token is invalid or expired: really logged out
      } else {
        setStatus('unavailable'); // network error, timeout, 5xx...: keep the token, let the user retry
      }
    }
  }, [endSession]);

  // Called by the Axios interceptor when a request that carried a token got a 401.
  const handleUnauthorized = useCallback(
    (rejectedToken) => {
      // If the rejected token is no longer the current one, this news is old: either we already
      // logged out because of an earlier 401 (several requests failing together give ONE logout),
      // or the user has logged in again since. Ignore it, never log out a newer session.
      if (rejectedToken !== getToken()) return;
      endSession(true);
    },
    [endSession]
  );

  // useLayoutEffect, not useEffect: layout effects all run BEFORE any useEffect in the whole app
  // (including a page's data-loading effect), so the handler is always registered before an
  // authenticated request can fail.
  useLayoutEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  // On startup: validate the stored token (if any).
  useEffect(() => {
    verifySession();
  }, [verifySession]);

  // login / register throw on failure so the form can show the message.
  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password }, { skipAuthHandler: true });
      startSession(data.token, data.user);
    },
    [startSession]
  );

  // The backend returns a token on register, so the new user is logged in immediately.
  const register = useCallback(
    async (name, email, password) => {
      const { data } = await api.post('/auth/register', { name, email, password }, { skipAuthHandler: true });
      startSession(data.token, data.user);
    },
    [startSession]
  );

  const logout = useCallback(() => endSession(false), [endSession]);

  const value = useMemo(
    () => ({ user, token, status, sessionExpired, login, register, logout, retry: verifySession }),
    [user, token, status, sessionExpired, login, register, logout, verifySession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
