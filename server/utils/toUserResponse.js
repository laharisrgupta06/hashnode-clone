// The ONLY shape in which the logged-in user is sent back to their own client
// (register, login, /auth/me, profile update).
// Built field by field so the password hash can never slip into a response.
const toUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
});

export default toUserResponse;
