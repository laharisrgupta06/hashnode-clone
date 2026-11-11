import { useParams } from 'react-router-dom';

export default function PostDetail() {
  const { slug } = useParams(); // the ":slug" part of /post/:slug
  return (
    <section className="page-shell">
      <h1>Post</h1>
      <p>
        Slug from the URL: <code>{slug}</code>
      </p>
      <p>This page is not built yet.</p>
    </section>
  );
}
