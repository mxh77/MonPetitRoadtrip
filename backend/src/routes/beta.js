const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

async function requireAdmin(req, res, next) {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { isAdmin: true } });
  if (!user?.isAdmin) return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  next();
}

router.use(auth);

// POST /api/beta/feedback — soumettre un feedback beta
router.post('/feedback', async (req, res) => {
  const { text, audioUrl } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Le texte du feedback est requis' });
  }

  try {
    const feedback = await prisma.betaFeedback.create({
      data: {
        userId: req.user.userId,
        text: text.trim(),
        audioUrl: audioUrl || null,
      },
    });

    res.status(201).json(feedback);
  } catch (err) {
    console.error('[BETA] feedback error:', err);
    res.status(500).json({ error: 'Impossible de sauvegarder le feedback' });
  }
});

// GET /api/beta/feedbacks — lister tous les feedbacks (admin uniquement)
router.get('/feedbacks', requireAdmin, async (req, res) => {
  const feedbacks = await prisma.betaFeedback.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(feedbacks);
});

module.exports = router;
