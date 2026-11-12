// Client-side form checks: quick feedback for the user. The SERVER repeats every check and
// stays the authority, so nothing here is a security measure.
// Each function returns an object like { email: 'message' }. An empty object means "valid".

export const MAX_NAME_LENGTH = 50; // same limit as the backend
export const MIN_PASSWORD_LENGTH = 6; // same limit as the backend

// Basic shape only: something@something.something with no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const checkEmail = (email) => {
  const value = email.trim();
  if (!value) return 'Email is required';
  if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email address';
  return null;
};

export const validateLogin = ({ email, password }) => {
  const errors = {};
  const emailError = checkEmail(email);
  if (emailError) errors.email = emailError;
  // Only "not empty": accounts made earlier may have shorter passwords, and the server decides.
  if (!password) errors.password = 'Password is required';
  return errors;
};

export const validateRegister = ({ name, email, password }) => {
  const errors = {};
  const cleanName = name.trim();
  if (!cleanName) errors.name = 'Name is required';
  else if ([...cleanName].length > MAX_NAME_LENGTH) errors.name = `Name must be at most ${MAX_NAME_LENGTH} characters`;

  const emailError = checkEmail(email);
  if (emailError) errors.email = emailError;

  if (!password) errors.password = 'Password is required';
  else if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  return errors;
};

// ---------- Profile settings and article editor ----------
export const MAX_BIO_LENGTH = 200; // same limit as the backend (PRD 4.1 schema)
export const MAX_TAGS = 10; // same limits as the backend
export const MAX_TAG_LENGTH = 30;

// Same rule as the backend's isHttpUrl: only http:// and https:// (blocks javascript:, data: ...).
export const isHttpUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export const validateProfile = ({ name, bio, avatarUrl }) => {
  const errors = {};
  const cleanName = name.trim();
  if (!cleanName) errors.name = 'Name is required';
  else if ([...cleanName].length > MAX_NAME_LENGTH) errors.name = `Name must be at most ${MAX_NAME_LENGTH} characters`;

  // .length on purpose: the server counts the bio the same way.
  if (bio.trim().length > MAX_BIO_LENGTH) errors.bio = `Bio must be at most ${MAX_BIO_LENGTH} characters`;

  const url = avatarUrl.trim();
  if (url && !isHttpUrl(url)) errors.avatarUrl = 'Enter a full image address starting with http:// or https://';
  return errors;
};

// Cleans one tag the way the server will store it: trimmed, single spaces, lowercase.
export const normalizeTag = (value) => value.trim().replace(/\s+/g, ' ').toLowerCase();

export const validateTag = (name, existing) => {
  if (!name) return 'Tag cannot be empty';
  if (name.length > MAX_TAG_LENGTH) return `A tag can have at most ${MAX_TAG_LENGTH} characters`;
  if (!/[a-z0-9]/.test(name)) return 'A tag must contain at least one letter or number';
  if (existing.includes(name)) return 'That tag is already added';
  if (existing.length >= MAX_TAGS) return `An article can have at most ${MAX_TAGS} tags`;
  return null;
};

// Title and content are required by the server even for drafts.
export const validatePost = ({ title, content, coverImage }) => {
  const errors = {};
  if (!title.trim()) errors.title = 'Add a title';
  if (!content.trim()) errors.content = 'Write some content first';
  const cover = coverImage.trim();
  if (cover && !isHttpUrl(cover)) errors.coverImage = 'Enter a full image address starting with http:// or https://';
  return errors;
};
