const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');

// Uses a DIFFERENT secret than regular restaurant admin JWTs
// Even if someone steals a restaurant JWT, it won't work here
const SUPER_SECRET = process.env.SUPER_ADMIN_JWT_SECRET;

if (!SUPER_SECRET) {
  console.error('❌ SUPER_ADMIN_JWT_SECRET is not set! Super admin panel will be inaccessible.');
}

const superAuth = async (req, res, next) => {
  try {
    // 1. Check secret is configured
    if (!SUPER_SECRET) {
      return res.status(503).json({ message: 'Super admin not configured' });
    }

    // 2. Extract token — must come from Authorization header only
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.replace('Bearer ', '').trim();

    // 3. Verify with super admin secret (different from regular JWT_SECRET)
    let decoded;
    try {
      decoded = jwt.verify(token, SUPER_SECRET);
    } catch {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // 4. Must have superadmin role claim in token
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // 5. Fetch from DB and validate still active
    const admin = await SuperAdmin.findById(decoded.id).select('-password');
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // 6. Check account not locked
    if (admin.isLocked()) {
      return res.status(423).json({ message: 'Account temporarily locked' });
    }

    // 7. Validate token is in active sessions (prevents revoked tokens)
    if (!admin.sessionTokens.includes(token)) {
      return res.status(401).json({ message: 'Session expired or revoked' });
    }

    req.superAdmin = admin;
    req.superToken = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

module.exports = superAuth;
