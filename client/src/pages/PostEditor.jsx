import { useParams } from 'react-router-dom';

// One component serves both routes: /editor/new (no id) and /editor/:id (edit).
export default function PostEditor() {
  const { id } = useParams();
  return (
    <section className="page-shell">
      <h1>{id ? 'Edit post' : 'New post'}</h1>
      {id && (
        <p>
          Post id from the URL: <code>{id}</code>
        </p>
      )}
      <p>This page is not built yet.</p>
    </section>
  );
}
