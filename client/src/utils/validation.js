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
