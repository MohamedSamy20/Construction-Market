import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export async function protect(req, res, next) {
  try {
    let token;
    const auth = req.headers.authorization || req.headers.Authorization;
    if (auth && String(auth).startsWith('Bearer ')) {
      token = String(auth).slice(7);
    }
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'changeme-secret');
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
}

export function requireRoles(...roles) {
  // Technician = Worker alias rule
  const norm = (r) => {
    if (!r) return r;
    const x = String(r);
    if (x.toLowerCase() === 'technician') return 'Worker';
    return x;
  };
  const required = roles.map(norm);
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
    const userRoles = [];
    if (Array.isArray(req.user.roles)) userRoles.push(...req.user.roles);
    if (req.user.role) userRoles.push(req.user.role);
    const normalizedUser = userRoles.map(norm);
    const allowed = normalizedUser.some((ur) => required.includes(ur));
    if (!allowed) return res.status(403).json({ success: false, message: 'Forbidden' });
    next();
  };
}
