const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/steps?roadtripId=
router.get('/', async (req, res) => {
  const { roadtripId } = req.query;

  if (!roadtripId) {
    return res.status(400).json({ error: 'roadtripId query param is required' });
  }

  // Verify the roadtrip belongs to the user
  const roadtrip = await prisma.roadtrip.findFirst({
    where: { id: roadtripId, userId: req.user.userId },
  });

  if (!roadtrip) {
    return res.status(404).json({ error: 'Roadtrip not found' });
  }

  const steps = await prisma.step.findMany({
    where: { roadtripId },
    orderBy: { order: 'asc' },
    include: {
      accommodation: true,
      activities: { orderBy: { order: 'asc' } },
    },
  });

  res.json(steps);
});

// POST /api/steps
router.post('/', async (req, res) => {
  const {
    roadtripId, type, name, location, latitude, longitude,
    startDate, endDate, arrivalTime, departureTime, notes, photoUrl, order,
  } = req.body;

  if (!roadtripId || !type || !name) {
    return res.status(400).json({ error: 'roadtripId, type and name are required' });
  }

  const roadtrip = await prisma.roadtrip.findFirst({
    where: { id: roadtripId, userId: req.user.userId },
  });

  if (!roadtrip) {
    return res.status(404).json({ error: 'Roadtrip not found' });
  }

  const step = await prisma.step.create({
    data: {
      roadtripId,
      userId: req.user.userId,
      type,
      name,
      location: location || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      arrivalTime: arrivalTime || null,
      departureTime: departureTime || null,
      notes: notes || null,
      photoUrl: photoUrl || null,
      order: order ?? 0,
    },
    include: { accommodation: true, activities: true },
  });

  res.status(201).json(step);
});

// PATCH /api/steps/:id
router.patch('/:id', async (req, res) => {
  const step = await prisma.step.findFirst({
    where: { id: req.params.id },
    include: { roadtrip: true },
  });

  if (!step || step.roadtrip.userId !== req.user.userId) {
    return res.status(404).json({ error: 'Step not found' });
  }

  const {
    type, name, location, latitude, longitude,
    startDate, endDate, arrivalTime, departureTime, notes, photoUrl, order,
  } = req.body;

  const updated = await prisma.step.update({
    where: { id: req.params.id },
    data: {
      ...(type !== undefined && { type }),
      ...(name !== undefined && { name }),
      ...(location !== undefined && { location }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(arrivalTime !== undefined && { arrivalTime }),
      ...(departureTime !== undefined && { departureTime }),
      ...(notes !== undefined && { notes }),
      ...(photoUrl !== undefined && { photoUrl }),
      ...(order !== undefined && { order }),
    },
    include: { accommodation: true, activities: { orderBy: { order: 'asc' } } },
  });

  res.json(updated);
});

// DELETE /api/steps/:id
router.delete('/:id', async (req, res) => {
  const step = await prisma.step.findFirst({
    where: { id: req.params.id },
    include: { roadtrip: true },
  });

  if (!step || step.roadtrip.userId !== req.user.userId) {
    return res.status(404).json({ error: 'Step not found' });
  }

  await prisma.step.delete({ where: { id: req.params.id } });

  res.status(204).send();
});

module.exports = router;
