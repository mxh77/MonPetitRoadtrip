const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

// All roadtrip routes require authentication
router.use(auth);

// GET /api/roadtrips
router.get('/', async (req, res) => {
  const roadtrips = await prisma.roadtrip.findMany({
    where: { userId: req.user.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        select: { id: true, type: true, name: true, location: true, startDate: true, order: true },
      },
    },
  });
  res.json(roadtrips);
});

// POST /api/roadtrips
router.post('/', async (req, res) => {
  const { title, startDate, endDate, coverPhotoUrl, status } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const roadtrip = await prisma.roadtrip.create({
    data: {
      title,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      coverPhotoUrl: coverPhotoUrl || null,
      status: status || 'DRAFT',
      userId: req.user.userId,
    },
  });

  res.status(201).json(roadtrip);
});

// GET /api/roadtrips/:id
router.get('/:id', async (req, res) => {
  const roadtrip = await prisma.roadtrip.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        include: {
          accommodation: true,
          activities: { orderBy: { order: 'asc' } },
        },
      },
    },
  });

  if (!roadtrip) {
    return res.status(404).json({ error: 'Roadtrip not found' });
  }

  res.json(roadtrip);
});

// PUT /api/roadtrips/:id — upsert (ID généré côté client pour l'offline-first)
router.put('/:id', async (req, res) => {
  const { title, startDate, endDate, coverPhotoUrl, status } = req.body;

  const roadtrip = await prisma.roadtrip.upsert({
    where: { id: req.params.id },
    create: {
      id: req.params.id,
      title: title || 'Nouveau roadtrip',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      coverPhotoUrl: coverPhotoUrl || null,
      status: status || 'DRAFT',
      userId: req.user.userId,
    },
    update: {
      ...(title !== undefined && { title }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(coverPhotoUrl !== undefined && { coverPhotoUrl }),
      ...(status !== undefined && { status }),
    },
  });

  res.json(roadtrip);
});

// PATCH /api/roadtrips/:id
router.patch('/:id', async (req, res) => {
  const existing = await prisma.roadtrip.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Roadtrip not found' });
  }

  const { title, startDate, endDate, coverPhotoUrl, status } = req.body;

  const roadtrip = await prisma.roadtrip.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(coverPhotoUrl !== undefined && { coverPhotoUrl }),
      ...(status !== undefined && { status }),
    },
  });

  res.json(roadtrip);
});

// DELETE /api/roadtrips/:id
router.delete('/:id', async (req, res) => {
  const existing = await prisma.roadtrip.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Roadtrip not found' });
  }

  await prisma.roadtrip.delete({ where: { id: req.params.id } });

  res.status(204).send();
});

module.exports = router;
