// Basic email check used when an account is CREATED (register). Same rule as the client form:
// something@something.something with no spaces. It only catches typos like "abc" or "a@b";
// it cannot prove the address exists (that would need a confirmation email).
// 254 characters is the maximum length of an email address under the email standards.
export const MAX_EMAIL_LENGTH = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email) => email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
