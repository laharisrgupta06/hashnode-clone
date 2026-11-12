import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import api, { clearToken, setUnauthorizedHandler } from '../api/axios.js';

// Runs after every test so no test can leak state into the next one.
afterEach(() => {
  cleanup(); // unmount whatever the test rendered
  clearToken(); // forget any saved token (localStorage and the in-memory fallback)
  localStorage.clear();
  setUnauthorizedHandler(null);
  delete api.defaults.adapter; // back to the real adapter (tests install a fake server)
});
