const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

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

module.exports = router;
