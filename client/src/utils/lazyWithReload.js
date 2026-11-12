import { lazy } from 'react';

// A lazily loaded module can fail to download when the app was updated while a tab was open:
//   - in development, Vite re-bundles dependencies (e.g. after `npm install`) and answers requests
//     for the old versions with HTTP 504;
//   - in production, a new deploy replaces the hashed chunk files the open tab still refers to.
// The browser then reports "Importing a module script failed" / "Failed to fetch dynamically
// imported module". The cure is a fresh page load, which fetches the current versions.
//
// This reloads AT MOST ONCE per short window (a sessionStorage stamp), so a module that is really
// broken shows the error page instead of reloading forever.
const STAMP_KEY = 'devpress_chunk_reload_at';
const WINDOW_MS = 30 * 1000;

export function isChunkLoadError(error) {
  const message = String(error?.message ?? error ?? '');
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS|Outdated Optimize Dep/i.test(message);
}

// Returns true if a reload was started (the caller should stop), false if we already tried.
export function reloadOnceForStaleChunk() {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(STAMP_KEY)) || 0;
  } catch {
    return false; // storage blocked: cannot guard against loops, so do not auto-reload
  }
  if (Date.now() - last < WINDOW_MS) return false;
  try {
    sessionStorage.setItem(STAMP_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

export default function lazyWithReload(importer) {
  return lazy(() =>
    importer().catch((error) => {
      if (isChunkLoadError(error) && reloadOnceForStaleChunk()) {
        return new Promise(() => {}); // keep showing the loading state while the page reloads
      }
      throw error; // a real problem: let the error page show it
    })
  );
}
