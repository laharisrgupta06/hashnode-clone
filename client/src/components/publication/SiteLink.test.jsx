import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import SiteLink from './SiteLink.jsx';

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

describe('SiteLink (workspace to public publication)', () => {
  it('opens in a new tab, safely, and says so to screen readers', () => {
    render(
      <MemoryRouter>
        <SiteLink to="/p/field-notes">View site</SiteLink>
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: /^view site\s*\(opens in a new tab\)$/i });
    expect(link.getAttribute('href')).toBe('/p/field-notes');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('extends an explicit label', () => {
    render(
      <MemoryRouter>
        <SiteLink to="/p/x/y" aria-label="View My article">
          View
        </SiteLink>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'View My article (opens in a new tab)' })).toBeTruthy();
  });

  it('leaves the click to the browser: the workspace route does not change', () => {
    render(
      <MemoryRouter initialEntries={['/publications/field-notes/dashboard']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <Where />
                <SiteLink to="/p/field-notes">View site</SiteLink>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: /view site/i });
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(click);
    expect(screen.getByTestId('where').textContent).toBe('/publications/field-notes/dashboard');
  });
});
