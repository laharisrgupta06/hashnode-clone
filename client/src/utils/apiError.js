// Turns an Axios error into a message that is safe and useful to show the user.
// kind:
//   'credentials' - 401: wrong email or password (login)
//   'client'      - another 4xx: the server explains what is wrong (e.g. "email already exists")
//   'server'      - 5xx: not the user's fault; we do NOT show raw server error text
//   'network'     - no response at all (offline, server down) or a timeout
export function describeError(error) {
  if (error.response) {
    const { status, data } = error.response;
    if (status >= 500) {
      return { kind: 'server', message: 'Something went wrong on the server. Please try again in a moment.' };
    }
    const serverMessage = typeof data?.message === 'string' && data.message ? data.message : 'The request could not be completed.';
    return { kind: status === 401 ? 'credentials' : 'client', message: serverMessage };
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return { kind: 'network', message: 'The server took too long to respond. Please try again.' };
  }
  return { kind: 'network', message: 'Could not reach the server. Check your connection and try again.' };
}
