const mongoose = require('mongoose');

// SuperAdmin is completely separate from Restaurant admins
// Has its own collection, own JWT secret, own auth flow
const superAdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'superadmin', immutable: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  ipWhitelist: [{ type: String }], // Optional IP restriction
  sessionTokens: [{ type: String }], // Track active sessions for revocation
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, { timestamps: true });

// Lock account after 5 failed attempts for 30 minutes
superAdminSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > Date.now();
};

superAdminSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    // Reset if lock expired
    await this.updateOne({ loginAttempts: 1, $unset: { lockedUntil: 1 } });
    return;
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) };
  }
  await this.updateOne(updates);
};

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
