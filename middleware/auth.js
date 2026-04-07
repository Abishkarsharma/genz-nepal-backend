const jwt = require('jsonwebtoken');

// Verify JWT and attach user to request
const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Only allow specific roles
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Access denied: insufficient role' });
  }
  next();
};

module.exports = { protect, requireRole };
