import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Put this in front of any route that needs a logged-in user:
//   router.get('/me', protect, getMe)
// If the token is valid, the user is attached as req.user and the request continues.
// Otherwise the request stops here with a 401 and never reaches the controller.
export const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Not authorized: no token provided');
  }

  const token = header.split(' ')[1];

  let decoded;
  try {
    // verify checks the signature AND the expiry date.
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized: token is invalid or has expired');
  }

  // Look the user up again so a deleted account can no longer use an old token.
  // The password hash is not selected (select: false on the model).
  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(401);
    throw new Error('Not authorized: user no longer exists');
  }

  req.user = user;
  next();
};
