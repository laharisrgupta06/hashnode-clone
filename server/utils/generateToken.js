import jwt from 'jsonwebtoken';

// Creates a signed JWT containing only the user's id.
// The secret and lifetime come from .env (JWT_SECRET, JWT_EXPIRES_IN).
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

export default generateToken;
