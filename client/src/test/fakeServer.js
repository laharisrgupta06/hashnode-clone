import { AxiosError } from 'axios';
import api from '../api/axios.js';

// A fake backend for tests. It replaces only the last step of Axios (the "adapter" that would
// send the HTTP request), so our real interceptors still run exactly as in the browser.
//
//   const server = installFakeServer({ 'GET /auth/me': () => reply(200, { user }) });
//   server.requests -> every request the app made: [{ method, url, authorization }]
//
// A route handler returns reply(status, data), networkError(), or a Promise of either
// (to control exactly WHEN a response arrives).
export const reply = (status, data = {}) => ({ status, data });
export const networkError = () => ({ network: true });

export function installFakeServer(routes) {
  const requests = [];
  api.defaults.adapter = async (config) => {
    const key = `${config.method.toUpperCase()} ${config.url}`;
    const authorization = config.headers?.Authorization;
    requests.push({ method: config.method.toUpperCase(), url: config.url, authorization });

    const handler = routes[key];
    if (!handler) throw new Error(`Fake server: no route for ${key}`);
    const result = await handler(config);

    if (result.network) {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {});
    }
    const response = { status: result.status, statusText: '', data: result.data, headers: {}, config };
    if (result.status >= 200 && result.status < 300) return response;
    throw new AxiosError(`Request failed with status code ${result.status}`, AxiosError.ERR_BAD_REQUEST, config, {}, response);
  };
  return { requests };
}

// A promise you resolve later, to hold a response back until the test says so.
export function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
