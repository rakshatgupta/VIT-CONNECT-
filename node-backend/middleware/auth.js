const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  const [scheme, token] = (req.header('Authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ msg: 'Sign in to continue.' });

  let user;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    user = decoded.user || decoded;
    if (!/^[a-f0-9]{24}$/i.test(user.id)) throw new Error('Invalid user');
  } catch {
    return res.status(401).json({ msg: 'Your session has expired.' });
  }

  try {
    if (!await User.exists({ _id: user.id })) {
      return res.status(401).json({ msg: 'Your account no longer exists.' });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
