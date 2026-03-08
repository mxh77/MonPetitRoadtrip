const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

const ACCESS_TOKEN_TTL  = '1h';
const REFRESH_TOKEN_DAYS = 90;

function generateAccessToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, name: name || null, password: hash },
    select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
  });

  const token = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  res.status(201).json({ user, token, refreshToken });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { password: _pw, ...safeUser } = user;

  const token = generateAccessToken(safeUser);
  const refreshToken = await generateRefreshToken(user.id);

  res.json({ user: safeUser, token, refreshToken });
});

// POST /api/auth/refresh — renouvelle l'access token via le refresh token (rotation)
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  // Rotation : révoquer l'ancien, émettre un nouveau
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
    select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
  });
  if (!user) return res.status(401).json({ error: 'User not found' });

  const newToken = generateAccessToken(user);
  const newRefreshToken = await generateRefreshToken(user.id);

  res.json({ token: newToken, refreshToken: newRefreshToken });
});

// POST /api/auth/logout — révoque le refresh token
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    }).catch(() => {});
  }
  res.status(204).send();
});

// GET /api/auth/powersync-token — génère un token JWT compatible PowerSync
router.get('/powersync-token', auth, async (req, res) => {
  // PowerSync attend le secret décodé depuis base64url (pas la string brute)
  const psSecret = Buffer.from(process.env.POWERSYNC_JWT_SECRET, 'base64url');
  const psToken = jwt.sign(
    {
      sub: req.user.userId,
      user_id: req.user.userId,  // claim custom accessible via token_parameters.user_id
      iat: Math.floor(Date.now() / 1000),
    },
    psSecret,
    {
      expiresIn: '1h',
      audience: process.env.POWERSYNC_URL,
      keyid: process.env.POWERSYNC_JWT_KID,
    }
  );

  res.json({ token: psToken, powersyncUrl: process.env.POWERSYNC_URL });
});

module.exports = router;

  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, name: name || null, password: hash },
    select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
  });

  const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  res.status(201).json({ user, token });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  const { password: _pw, ...safeUser } = user;

  res.json({ user: safeUser, token });
});

// GET /api/auth/powersync-token — génère un token JWT compatible PowerSync
router.get('/powersync-token', auth, async (req, res) => {
  // PowerSync attend le secret décodé depuis base64url (pas la string brute)
  const psSecret = Buffer.from(process.env.POWERSYNC_JWT_SECRET, 'base64url');
  const psToken = jwt.sign(
    {
      sub: req.user.userId,
      user_id: req.user.userId,  // claim custom accessible via token_parameters.user_id
      iat: Math.floor(Date.now() / 1000),
    },
    psSecret,
    {
      expiresIn: '1h',
      audience: process.env.POWERSYNC_URL,
      keyid: process.env.POWERSYNC_JWT_KID,
    }
  );

  res.json({ token: psToken, powersyncUrl: process.env.POWERSYNC_URL });
});

module.exports = router;
