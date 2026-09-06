const crypto = require('node:crypto');

// In-memory token store: token -> user session
const tokenStore = new Map();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPasswordHash) {
  try {
    const [salt, hash] = storedPasswordHash.split(':');
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch (err) {
    return false;
  }
}

function generateToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  tokenStore.set(token, session);
  return token;
}

function getSession(token) {
  if (!token) return null;
  const session = tokenStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    tokenStore.delete(token);
    return null;
  }
  return session;
}

function revokeToken(token) {
  if (token) tokenStore.delete(token);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  getSession,
  revokeToken
};
