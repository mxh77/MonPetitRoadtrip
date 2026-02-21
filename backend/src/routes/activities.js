const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/activities?stepId=
router.get('/', async (req, res) => {
  const { stepId } = req.query;

  if (!stepId) {
    return res.status(400).json({ error: 'stepId query param is required' });
  }

  const step = await prisma.step.findFirst({
    where: { id: stepId },
    include: { roadtrip: true },
  });

  if (!step || step.roadtrip.userId !== req.user.userId) {
    return res.status(404).json({ error: 'Step not found' });
  }

  const activities = await prisma.activity.findMany({
    where: { stepId },
    orderBy: { order: 'asc' },
  });

  res.json(activities);
});

// POST /api/activities
router.post('/', async (req, res) => {
  const { stepId, type, name, location, startTime, endTime, bookingRef, bookingUrl, cost, currency, notes, status, order } = req.body;

  if (!stepId || !name) {
    return res.status(400).json({ error: 'stepId and name are required' });
  }

  const step = await prisma.step.findFirst({
    where: { id: stepId },
    include: { roadtrip: true },
  });

  if (!step || step.roadtrip.userId !== req.user.userId) {
    return res.status(404).json({ error: 'Step not found' });
  }

  const activity = await prisma.activity.create({
    data: {
      stepId,
      userId: req.user.userId,
      type: type || 'OTHER',
      name,
      location: location || null,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      bookingRef: bookingRef || null,
      bookingUrl: bookingUrl || null,
      cost: cost ?? null,
      currency: currency || 'EUR',
      notes: notes || null,
      status: status || 'PLANNED',
      order: order ?? 0,
    },
  });

  res.status(201).json(activity);
});

// PATCH /api/activities/:id
router.patch('/:id', async (req, res) => {
  const activity = await prisma.activity.findFirst({
    where: { id: req.params.id },
    include: { step: { include: { roadtrip: true } } },
  });

  if (!activity || activity.step.roadtrip.userId !== req.user.userId) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  const { type, name, location, startTime, endTime, bookingRef, bookingUrl, cost, currency, notes, status, order } = req.body;

  const updated = await prisma.activity.update({
    where: { id: req.params.id },
    data: {
      ...(type !== undefined && { type }),
      ...(name !== undefined && { name }),
      ...(location !== undefined && { location }),
      ...(startTime !== undefined && { startTime: startTime ? new Date(startTime) : null }),
      ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
      ...(bookingRef !== undefined && { bookingRef }),
      ...(bookingUrl !== undefined && { bookingUrl }),
      ...(cost !== undefined && { cost }),
      ...(currency !== undefined && { currency }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
      ...(order !== undefined && { order }),
    },
  });

  res.json(updated);
});

// DELETE /api/activities/:id
router.delete('/:id', async (req, res) => {
  const activity = await prisma.activity.findFirst({
    where: { id: req.params.id },
    include: { step: { include: { roadtrip: true } } },
  });

  if (!activity || activity.step.roadtrip.userId !== req.user.userId) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  await prisma.activity.delete({ where: { id: req.params.id } });

  res.status(204).send();
});

module.exports = router;
