import { useState } from 'react';
import api from '../../api/axios.js';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import { describeError } from '../../utils/apiError.js';

// "Delete this article?" + the DELETE request. Used by the dashboard and the editor.
// onDeleted(post) runs only after the server confirmed the deletion.
export default function DeletePostDialog({ post, onCancel, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await api.delete(`/posts/${post._id}`);
      onDeleted(post);
    } catch (err) {
      // 404: someone (or another tab) already deleted it. Treat as done.
      if (err.response?.status === 404) onDeleted(post);
      else setError(describeError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={Boolean(post)}
      title="Delete this article?"
      confirmLabel="Delete article"
      busyLabel="Deleting…"
      danger
      busy={busy}
      error={error}
      onConfirm={confirm}
      onCancel={onCancel}
    >
      <p>
        &ldquo;{post?.title}&rdquo; will be removed permanently. {post?.status === 'published' && 'It will disappear from the feed, its tags and your profile. '}This cannot be undone.
      </p>
    </ConfirmDialog>
  );
}
