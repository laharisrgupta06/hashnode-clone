// Date helpers for article metadata. The backend has no separate publish date, so "published" is the
// post's createdAt (agreed project decision) and "updated" is updatedAt.
const DATE_FORMAT = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' });

export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : DATE_FORMAT.format(date);
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : DATE_TIME_FORMAT.format(date);
}

// Saving a post always refreshes updatedAt, so tiny gaps (the same save) do not count as an edit.
export function wasEdited(createdAt, updatedAt) {
  const gap = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  return Number.isFinite(gap) && gap > 60 * 1000;
}

// "1 article", "3 articles"
export function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
