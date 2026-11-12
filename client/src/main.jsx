import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import AppError from './pages/AppError.jsx';
import { reloadOnceForStaleChunk } from './utils/lazyWithReload.js';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/index.css';

// A "data router" (createBrowserRouter) instead of <BrowserRouter>: it is what enables useBlocker,
// which the editor uses to warn before leaving with unsaved changes. All routes still live in
// App.jsx; this single catch-all route just hands every URL to it.
const router = createBrowserRouter([{ path: '*', element: <App />, errorElement: <AppError /> }]);

// Production builds: Vite fires this when a hashed chunk from an older deploy can no longer be
// preloaded. Reload once to get the current files (see utils/lazyWithReload.js).
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForStaleChunk()) event.preventDefault();
});

// AuthProvider sits around everything so every page can ask "who is logged in?" (useAuth).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);
