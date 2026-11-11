import axios from 'axios';

// The key under which the JWT is kept in localStorage (the PRD requires localStorage).
// AuthContext (next layer) will save the token under this key after login.
export const TOKEN_KEY = 'hashnode_token';

const baseURL = import.meta.env.VITE_API_URL;

// Fail loudly: without a base URL every request would go to the wrong place.
if (!baseURL) {
  throw new Error('VITE_API_URL is not set. Copy client/.env.example to client/.env and restart the dev server.');
}

// Every page imports THIS instance instead of the plain axios, so the base URL
// and the token handling live in exactly one place.
const api = axios.create({ baseURL });

// Runs before every request: if a token is saved, send it as "Authorization: Bearer <token>",
// which is what the backend's `protect` middleware expects.
api.interceptors.request.use((config) => {
  let token = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    // localStorage can be blocked (e.g. some private-browsing modes): act as logged out.
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
