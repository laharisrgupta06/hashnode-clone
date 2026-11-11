import axios from 'axios';

// ---------------------------------------------------------------------------
// Token storage
// The JWT lives in localStorage (PRD requirement), so it survives page refreshes.
// If the browser blocks localStorage (some private modes), we keep the token in memory
// instead: login still works, the session is just lost on refresh.
// EVERYTHING that needs the current token (this file's interceptors, AuthContext) must call
// getToken() below, so there is only ever one answer to "what is the current token?".
// ---------------------------------------------------------------------------
export const TOKEN_KEY = 'hashnode_token';

let memoryToken = null; // only used when localStorage failed (see setToken)

export const getToken = () => {
  if (memoryToken) return memoryToken; // set only when saving to localStorage failed
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // storage blocked
  }
};

export const setToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    memoryToken = null; // saved properly, no fallback needed
  } catch {
    memoryToken = token; // storage blocked or full: remember it in memory for this tab
  }
};

// Logout: remove the token from BOTH places.
export const clearToken = () => {
  memoryToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing to remove if storage is blocked
  }
};

// ---------------------------------------------------------------------------
// The Axios instance every page uses
// ---------------------------------------------------------------------------
const baseURL = import.meta.env.VITE_API_URL;

// Fail loudly: without a base URL every request would go to the wrong place.
if (!baseURL) {
  throw new Error('VITE_API_URL is not set. Copy client/.env.example to client/.env and restart the dev server.');
}

// Without a timeout a hung server would leave the page waiting forever.
// This is only the DEFAULT: a future slow operation can override it per request,
// e.g. api.post('/something-slow', data, { timeout: 60000 }).
export const DEFAULT_TIMEOUT_MS = 20000;

const api = axios.create({ baseURL, timeout: DEFAULT_TIMEOUT_MS });

// Before every request: if we have a token, send it as "Authorization: Bearer <token>",
// which is what the backend's `protect` middleware expects.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Session-expired handling (a 401 from the server)
// This file cannot import React state, so AuthContext registers a callback here.
// ---------------------------------------------------------------------------
let unauthorizedHandler = null;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;

    // Only a real HTTP 401 counts. Network errors, timeouts and 5xx have no 401 status,
    // so they never get here and never log anybody out.
    // Requests marked skipAuthHandler (login, register, the startup /auth/me check) are
    // handled by the caller: a wrong password is also a 401 but it is NOT an expired session.
    if (error.response?.status === 401 && config && !config.skipAuthHandler && unauthorizedHandler) {
      const sentHeader = config.headers?.Authorization;
      const rejectedToken = typeof sentHeader === 'string' && sentHeader.startsWith('Bearer ') ? sentHeader.slice(7) : null;
      // No token was sent -> nothing to expire. Otherwise tell AuthContext WHICH token was rejected,
      // so it can ignore the news if the user has meanwhile logged in again with a different one.
      if (rejectedToken) unauthorizedHandler(rejectedToken);
    }

    return Promise.reject(error);
  }
);

export default api;
