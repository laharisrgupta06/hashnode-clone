import { useParams } from 'react-router-dom';

export default function TagPage() {
  const { slug } = useParams();
  return (
    <section className="page-shell">
      <h1>Tag</h1>
      <p>
        Tag from the URL: <code>{slug}</code>
      </p>
      <p>This page is not built yet.</p>
    </section>
  );
}
