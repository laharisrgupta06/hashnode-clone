// true only for http:// and https:// URLs. Blocks javascript:, data:, ftp: and plain text.
// Used for cover images and avatars, which end up in <img src="...">.
const isHttpUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export default isHttpUrl;
