import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import ErrorMessage from '../common/ErrorMessage.jsx';

// Wrap a page in this to make it login-only:
//   <Route path="/publications" element={<ProtectedRoute><MyPublications /></ProtectedRoute>} />
// The page inside is only RENDERED once the server has confirmed the session, so its content
// (and any data it would load) can never flash for a visitor who is not logged in.
export default function ProtectedRoute({ children }) {
  const { status, sessionExpired, retry } = useAuth();
  const location = useLocation();

  // Remembers whether the user was logged in while looking at THIS page (to spot a deliberate logout).
  const wasAuthenticated = useRef(false);
  useEffect(() => {
    if (status === 'authenticated') wasAuthenticated.current = true;
  }, [status]);

  if (status === 'loading') {
    return <LoadingSpinner label="Checking your session…" />;
  }

  if (status === 'unavailable') {
    // We could not reach the server, so we do not know. Do NOT send the user to the login page:
    // their login is still saved. Offer a retry instead.
    return (
      <ErrorMessage
        message="We couldn't verify your session because the server isn't responding. You are still logged in; please try again."
        onRetry={retry}
      />
    );
  }

  if (status === 'guest') {
    // The user was logged in on this page and clicked Logout: go home, and do not remember this page
    // (otherwise the next person to log in on a shared computer would be taken to it).
    if (wasAuthenticated.current && !sessionExpired) {
      return <Navigate to="/" replace />;
    }
    // Not logged in, or the session was ended by the server: go to the login page and remember
    // this page, so login can bring the user back here.
    return <Navigate to="/login" replace state={{ from: location, expired: sessionExpired }} />;
  }

  return children;
}
