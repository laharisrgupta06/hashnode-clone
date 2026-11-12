import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { isChunkLoadError, reloadOnceForStaleChunk } from './lazyWithReload.js';
import AppError from '../pages/AppError.jsx';

const reload = vi.fn();
beforeEach(() => {
  sessionStorage.clear();
  reload.mockReset();
  vi.stubGlobal('location', { ...window.location, reload });
});

describe('stale module recovery', () => {
  it('recognises the browsers\' failed-module messages, and nothing else', () => {
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true); // Safari
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /x.js'))).toBe(true); // Chrome
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true); // Firefox
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
  });

  it('reloads once, then refuses within the window so a broken module cannot loop', () => {
    expect(reloadOnceForStaleChunk()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadOnceForStaleChunk()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('AppError page', () => {
  const renderWithError = (error) => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: null,
        loader: () => {
          throw error;
        },
        errorElement: <AppError />,
      },
    ]);
    render(<RouterProvider router={router} />);
  };

  it('explains a stale module and offers a reload instead of the bare default screen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithError(new TypeError('Importing a module script failed.'));
    expect(await screen.findByRole('heading', { name: 'This page needs to be reloaded' })).toBeTruthy();
    screen.getByRole('button', { name: 'Reload page' }).click();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Go to the home page' }).getAttribute('href')).toBe('/');
  });

  it('shows a general message for other errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithError(new Error('boom'));
    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeTruthy();
  });
});
