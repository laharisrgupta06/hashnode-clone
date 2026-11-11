import { useParams } from 'react-router-dom';

export default function Profile() {
  const { id } = useParams();
  return (
    <section className="page-shell">
      <h1>Profile</h1>
      <p>
        User id from the URL: <code>{id}</code>
      </p>
      <p>This page is not built yet.</p>
    </section>
  );
}
