import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';

// Renders a component with a chosen auth state (no server involved) inside a router.
// Returns RTL's result plus setAuth(newValues) to simulate a change, e.g. a logout.
export function renderWithAuth(ui, { auth = {}, route = '/' } = {}) {
  const base = { user: null, token: null, status: 'guest', sessionExpired: false, login: async () => {}, register: async () => {}, logout: () => {}, retry: () => {} };
  let value = { ...base, ...auth };
  const wrap = (node) => (
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[route]}>{node}</MemoryRouter>
    </AuthContext.Provider>
  );
  const result = render(wrap(ui));
  const setAuth = (changes) => {
    value = { ...value, ...changes };
    result.rerender(wrap(ui));
  };
  return { ...result, setAuth };
}
