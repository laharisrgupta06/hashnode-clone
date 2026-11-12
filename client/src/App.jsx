import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import api from './api/axios.js';
import useRequest from './hooks/useRequest.js';
import AppShell from './components/layout/AppShell.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';
import WorkspaceLayout from './components/workspace/WorkspaceLayout.jsx';
import PublicationSite from './components/publication/PublicationSite.jsx';
import Landing from './pages/Landing.jsx';
import Explore from './pages/Explore.jsx';
import About from './pages/About.jsx';
import Tags from './pages/Tags.jsx';
import TagPage from './pages/TagPage.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import MyPublications from './pages/MyPublications.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewPublication from './pages/NewPublication.jsx';
import Overview from './pages/workspace/Overview.jsx';
import Articles from './pages/workspace/Articles.jsx';
import Analytics from './pages/workspace/Analytics.jsx';
import Appearance from './pages/workspace/Appearance.jsx';
import Domain from './pages/workspace/Domain.jsx';
import PublicationSettings from './pages/workspace/PublicationSettings.jsx';
import PostEditor from './pages/PostEditor.jsx';
import Profile from './pages/Profile.jsx';
import ProfileSettings from './pages/ProfileSettings.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import NotFound from './pages/NotFound.jsx';
import { LegacyEditorRedirect, LegacyPostRedirect } from './pages/LegacyRedirects.jsx';
import { hostMode } from './utils/publication.js';

// Publication websites live at /p/:slug/* with their own editorial frame (no platform shell).
function PathPublicationSite() {
  const { slug } = useParams();
  return <PublicationSite key={slug} slug={slug} base={`/p/${slug}`} />;
}

// The DevPress platform: landing page, discovery, accounts and the creator workspace.
function Platform() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/about" element={<About />} />
        <Route path="/tags" element={<Tags />} />
        <Route path="/tag/:slug" element={<TagPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Creator workspace (login required; each publication is checked for ownership by the server) */}
        <Route path="/publications" element={<ProtectedRoute><MyPublications /></ProtectedRoute>} />
        <Route path="/publications/new" element={<ProtectedRoute><NewPublication /></ProtectedRoute>} />
        <Route path="/publications/:slug" element={<ProtectedRoute><WorkspaceLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Overview />} />
          <Route path="articles" element={<Articles />} />
          <Route path="write" element={<PostEditor />} />
          <Route path="editor/:id" element={<PostEditor />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="appearance" element={<Appearance />} />
          <Route path="domain" element={<Domain />} />
          <Route path="settings" element={<PublicationSettings />} />
        </Route>

        {/* All my articles across every publication (each publication also has its own Articles page) */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        {/* Addresses from before publications existed */}
        <Route path="/editor/new" element={<Navigate to="/publications" replace />} />
        <Route path="/editor/:id" element={<ProtectedRoute><LegacyEditorRedirect /></ProtectedRoute>} />
        <Route path="/post/:slug" element={<LegacyPostRedirect />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}

function PlatformApp() {
  return (
    <Routes>
      <Route path="/p/:slug/*" element={<PathPublicationSite />} />
      <Route path="*" element={<Platform />} />
    </Routes>
  );
}

// A publication served at the root of its own host: <slug>.<platform domain> or a verified custom
// domain. Only active when VITE_PLATFORM_DOMAIN is configured (see utils/publication.js hostMode).
function HostedPublication({ mode }) {
  const { status, data } = useRequest(
    (signal) =>
      mode.mode === 'subdomain'
        ? Promise.resolve({ slug: mode.slug })
        : api.get('/publications/resolve-host', { params: { host: mode.host }, signal }).then((r) => r.data),
    [mode.mode, mode.slug, mode.host]
  );
  if (status === 'loading') return <LoadingSpinner label="Loading publication…" />;
  if (!data?.slug) return <PlatformApp />; // unknown or unverified host: show DevPress itself
  return <PublicationSite slug={data.slug} base="" />;
}

export default function App() {
  const mode = hostMode(window.location.hostname);
  return mode.mode === 'platform' ? <PlatformApp /> : <HostedPublication mode={mode} />;
}
