// A local safety copy of unsaved editor text, so nothing is lost if the session expires, the tab
// crashes or the network drops before Save. It is ONLY a backup:
//   - it is deleted after every successful save to the server;
//   - for an existing article it is offered back only if it was based on the SAME server version
//     (same updatedAt); if the article changed on the server since, the old backup is thrown away,
//     so a stale local copy can never silently overwrite newer saved work.
// Stored per user and per article in localStorage; every access is wrapped because storage can be
// blocked (private mode) or full.
const PREFIX = 'devpress_editor_backup';

const keyFor = (userId, postId) => `${PREFIX}:${userId}:${postId ?? 'new'}`;

export function readBackup(userId, postId) {
  try {
    const raw = localStorage.getItem(keyFor(userId, postId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeBackup(userId, postId, backup) {
  try {
    localStorage.setItem(keyFor(userId, postId), JSON.stringify({ ...backup, savedAt: new Date().toISOString() }));
  } catch {
    // storage blocked or full: the editor still works, just without a local safety copy
  }
}

export function clearBackup(userId, postId) {
  try {
    localStorage.removeItem(keyFor(userId, postId));
  } catch {
    // nothing to clear
  }
}
