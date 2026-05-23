import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ success: false, error: 'Token expired. Please log in again.' });
      }
      return res.status(403).json({ success: false, error: 'Invalid token. Please log in again.' });
    }
    req.teacherId = decoded.teacherId;
    req.email = decoded.email;
    req.firstName = decoded.firstName;
    req.lastName = decoded.lastName;
    req.department = decoded.department;
    next();
  });
}