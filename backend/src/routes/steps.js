const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { getUserRoleOnRoadtrip } = require('../lib/roleHelpers');

router.use(auth);

// GET /api/steps?roadtripId=
router.get('/', async (req, res) => {
  const { roadtripId } = req.query;

  if (!roadtripId) {
    return res.status(400).json({ error: 'roadtripId query param is required' });
  }

  const role = await getUserRoleOnRoadtrip(roadtripId, req.user.userId);
  if (!role) {
    return res.status(403).json({ error: 'Access denied' });
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

// POST /api/steps — écriture : EDITOR+
router.post('/', async (req, res) => {
  const {
    roadtripId, type, name, location, latitude, longitude,
    startDate, endDate, arrivalTime, departureTime, notes, photoUrl, order,
  } = req.body;

  if (!roadtripId || !type || !name) {
    return res.status(400).json({ error: 'roadtripId, type and name are required' });
  }

  const role = await getUserRoleOnRoadtrip(roadtripId, req.user.userId);
  if (!role) return res.status(404).json({ error: 'Roadtrip not found' });
  if (role === 'VIEWER') return res.status(403).json({ error: 'Role EDITOR required' });

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

// PUT /api/steps/:id — upsert (EDITOR+, ID généré côté client)
router.put('/:id', async (req, res) => {
  const {
    roadtripId, type, name, location, latitude, longitude,
    startDate, endDate, arrivalTime, departureTime, notes, photoUrl, order,
  } = req.body;

  if (!roadtripId) return res.status(400).json({ error: 'roadtripId is required' });

  const role = await getUserRoleOnRoadtrip(roadtripId, req.user.userId);
  if (!role) return res.status(404).json({ error: 'Roadtrip not found' });
  if (role === 'VIEWER') return res.status(403).json({ error: 'Role EDITOR required' });

  const step = await prisma.step.upsert({
    where: { id: req.params.id },
    create: {
      id: req.params.id,
      roadtripId,
      userId: req.user.userId,
      type: type || 'STAGE',
      name: name || 'Nouvelle étape',
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
    update: {
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
    include: { accommodation: true, activities: true },
  });

  res.json(step);
});

// PATCH /api/steps/:id — modification partielle (EDITOR+)
router.patch('/:id', async (req, res) => {
  const step = await prisma.step.findFirst({
    where: { id: req.params.id },
    select: { roadtripId: true },
  });

  if (!step) return res.status(404).json({ error: 'Step not found' });

  const role = await getUserRoleOnRoadtrip(step.roadtripId, req.user.userId);
  if (!role) return res.status(403).json({ error: 'Access denied' });
  if (role === 'VIEWER') return res.status(403).json({ error: 'Role EDITOR required' });

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

// DELETE /api/steps/:id — suppression (EDITOR+)
router.delete('/:id', async (req, res) => {
  const step = await prisma.step.findFirst({
    where: { id: req.params.id },
    select: { roadtripId: true },
  });

  if (!step) return res.status(404).json({ error: 'Step not found' });

  const role = await getUserRoleOnRoadtrip(step.roadtripId, req.user.userId);
  if (!role) return res.status(403).json({ error: 'Access denied' });
  if (role === 'VIEWER') return res.status(403).json({ error: 'Role EDITOR required' });

  await prisma.step.delete({ where: { id: req.params.id } });

  res.status(204).send();
});

module.exports = router;
