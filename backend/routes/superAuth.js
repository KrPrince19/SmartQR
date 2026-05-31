const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const superAuth = require('../middleware/superAuth');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const SUPER_SECRET = process.env.SUPER_ADMIN_JWT_SECRET;
const TOKEN_EXPIRY = '8h'; // Short-lived sessions

// Rate limiting state (in-memory, per IP)
const loginAttempts = new Map();
const rateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  // Keep only attempts in last 15 minutes
  const recent = attempts.filter((t) => now - t < 15 * 60 * 1000);
  if (recent.length >= 10) {
    return res.status(429).json({ message: 'Too many attempts. Try again later.' });
  }
  recent.push(now);
  loginAttempts.set(ip, recent);
  next();
};

// POST /api/super/auth/login
router.post('/login', rateLimit, async (req, res) => {
  try {
    if (!SUPER_SECRET) return res.status(503).json({ message: 'Service unavailable' });

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const admin = await SuperAdmin.findOne({ email: email.toLowerCase().trim() });

    // Generic message — don't leak whether email exists
    if (!admin) {
      await new Promise((r) => setTimeout(r, 800)); // Timing attack prevention
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check account active
    if (!admin.isActive) {
      return res.status(401).json({ message: 'Account disabled' });
    }

    // Check lock
    if (admin.isLocked()) {
      return res.status(423).json({ message: 'Account locked. Try again later.' });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      await admin.incrementLoginAttempts();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token with superadmin role claim
    const token = jwt.sign(
      { id: admin._id, role: 'superadmin', email: admin.email },
      SUPER_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    // Store token in active sessions (max 5 concurrent)
    const sessions = admin.sessionTokens.slice(-4);
    sessions.push(token);
    await admin.updateOne({
      $set: {
        sessionTokens: sessions,
        lastLogin: new Date(),
        loginAttempts: 0,
      },
      $unset: { lockedUntil: 1 },
    });

    res.json({
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: 'superadmin' },
      expiresIn: TOKEN_EXPIRY,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/super/auth/logout — revoke current session token
router.post('/logout', superAuth, async (req, res) => {
  try {
    await req.superAdmin.updateOne({
      $pull: { sessionTokens: req.superToken },
    });
    res.json({ message: 'Logged out' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/super/auth/me
router.get('/me', superAuth, (req, res) => {
  res.json({ admin: req.superAdmin });
});

// POST /api/super/auth/logout-all — revoke all sessions
router.post('/logout-all', superAuth, async (req, res) => {
  try {
    await req.superAdmin.updateOne({ sessionTokens: [] });
    res.json({ message: 'All sessions revoked' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await SuperAdmin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(404).json({ message: 'There is no super admin with that email' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    admin.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await admin.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/xpanel/reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) has requested the reset of the Super Admin password. Please go to the following link to reset your password: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        to: admin.email,
        subject: 'Super Admin Password reset token',
        text: message
      });
      res.status(200).json({ success: true, message: 'Email sent' });
    } catch (err) {
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpire = undefined;
      await admin.save();
      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const admin = await SuperAdmin.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    admin.password = await bcrypt.hash(req.body.password, 14); // super admin uses higher rounds
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;
    // Also revoke all sessions when password changes
    admin.sessionTokens = [];
    await admin.save();

    res.status(200).json({ success: true, message: 'Password updated successfully. Please log in with your new password.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
