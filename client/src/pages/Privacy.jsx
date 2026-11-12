import { Link } from 'react-router-dom';
import PageMeta from '../components/common/PageMeta.jsx';
import { SITE } from '../config/site.js';

// Describes only what this application actually does with data. Keep it in step with the code:
// if a feature starts storing something new, this page must say so.
export default function Privacy() {
  return (
    <article className="prose-page">
      <PageMeta title="Privacy Policy" description={`What data ${SITE.name} stores and how it is used.`} />
      <h1>Privacy Policy</h1>
      <p className="prose-updated">Last updated: November 12, 2026</p>

      <p>
        {SITE.name} is an independent blogging platform built as an individual software project. This page explains what information the application stores, what is public, and what stays private.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address and password. The password is stored only as a one-way bcrypt hash; the plain password is never saved.
        </li>
        <li>
          <strong>Profile details you choose to add:</strong> a short bio and the web address of an avatar image.
        </li>
        <li>
          <strong>Publications:</strong> the name, address (slug), tagline, description, logo and cover image addresses and appearance choices you give each publication, and which account owns it.
        </li>
        <li>
          <strong>Custom domains:</strong> domain names you add to a publication, their verification status and when they were last checked. Checking a domain performs a public DNS lookup of its verification record.
        </li>
        <li>
          <strong>Articles:</strong> titles, Markdown content, cover image addresses, tags, the publication each belongs to, whether each article is a draft or published, and when it was created and last updated.
        </li>
      </ul>

      <h2>What is public and what is private</h2>
      <ul>
        <li>Public: your name, bio and avatar, your publications (name, address, tagline, description, logo, cover and appearance) and the articles you publish, including their tags and dates.</li>
        <li>Private: your email address, your password hash, your drafts and your custom domains' verification details. Drafts are never shown on publication websites, in Explore, on topic pages or on your profile.</li>
      </ul>

      <h2>On your device</h2>
      <p>
        When you log in, a sign-in token is saved in your browser&apos;s local storage so you stay logged in after a refresh. Logging out removes it. While you write, the editor may keep a temporary copy of unsaved text in the same storage so it is not lost; it is removed when you save. {SITE.name} sets no cookies and uses no analytics or advertising trackers. Fonts are served by {SITE.name} itself.
      </p>

      <h2>Images from other websites</h2>
      <p>
        Cover images and avatars are loaded from the web addresses that authors provide. When your browser loads such an image, the website hosting it can see your IP address, as with any image on the web.
      </p>

      <h2>How the data is used</h2>
      <p>Your data is used only to run the platform: to sign you in, to show your profile and articles, and to let you manage your own content. It is not sold or shared for marketing.</p>

      <h2>Storage</h2>
      <p>Data is stored in a MongoDB database hosted by MongoDB Atlas. Access to the database is limited to the application.</p>

      <h2>Your choices</h2>
      <p>
        You can edit your profile in <Link to="/settings">Settings</Link> and manage your publications and their articles from <Link to="/publications">My publications</Link>. Deleting an article removes it permanently. The application does not yet offer a button to delete your whole account; contact the operator of this site to request it.
      </p>

      <h2>Changes</h2>
      <p>If the way data is handled changes, this page will be updated and the date above will change.</p>
    </article>
  );
}
