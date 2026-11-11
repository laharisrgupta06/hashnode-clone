import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import Feed from './pages/Feed.jsx';
import PostDetail from './pages/PostDetail.jsx';
import Tags from './pages/Tags.jsx';
import TagPage from './pages/TagPage.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PostEditor from './pages/PostEditor.jsx';
import Profile from './pages/Profile.jsx';
import ProfileSettings from './pages/ProfileSettings.jsx';
import NotFound from './pages/NotFound.jsx';

// The route table from PRD section 6.1. Navbar and Footer wrap every page;
// only the <Routes> block in the middle changes when the URL changes.
// NOTE: /dashboard, /editor/* and /settings are NOT protected yet. ProtectedRoute comes with the auth layer.
export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="container main">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/post/:slug" element={<PostDetail />} />
          {/* /tags = the list of all tags (PRD 2.1.C; missing from the PRD route table). /tag/:slug = one tag. */}
          <Route path="/tags" element={<Tags />} />
          <Route path="/tag/:slug" element={<TagPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/editor/new" element={<PostEditor />} />
          <Route path="/editor/:id" element={<PostEditor />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/settings" element={<ProfileSettings />} />
          {/* Any other URL */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
