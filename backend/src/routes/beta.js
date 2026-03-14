const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

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

module.exports = router;
