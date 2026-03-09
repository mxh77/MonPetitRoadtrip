const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { getUserRoleViaStep } = require('../lib/roleHelpers');

router.use(auth);

// GET /api/activities?stepId=
router.get('/', async (req, res) => {
  const { stepId } = req.query;

  if (!stepId) {
    return res.status(400).json({ error: 'stepId query param is required' });
  }

  const role = await getUserRoleViaStep(stepId, req.user.userId);
  if (!role) {
    return res.status(404).json({ error: 'Step not found' });
  }

  const activities = await prisma.activity.findMany({
    where: { stepId },
    orderBy: { order: 'asc' },
  });

  res.json(activities);
});

// POST /api/activities — écriture : EDITOR+
router.post('/', async (req, res) => {
  const { stepId, type, name, location, startTime, endTime, bookingRef, bookingUrl, cost, currency, notes, status, order } = req.body;

  if (!stepId || !name) {
    return res.status(400).json({ error: 'stepId and name are required' });
  }

  const role = await getUserRoleViaStep(stepId, req.user.userId);
  if (!role) return res.status(404).json({ error: 'Step not found' });
  if (role === 'VIEWER') return res.status(403).json({ error: 'Role EDITOR required' });

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

// PUT /api/activities/:id — upsert (EDITOR+, ID généré côté client)
router.put('/:id', async (req, res) => {
  const { stepId, type, name, location, startTime, endTime, bookingRef, bookingUrl, cost, currency, notes, status, order } = req.body;

  if (!stepId) return res.status(400).json({ error: 'stepId is required' });

  const role = await getUserRoleViaStep(stepId, req.user.userId);
  if (!role) return res.status(404).json({ error: 'Step not found' });
  if (role === 'VIEWER') return res.status(403).json({ error: 'Role EDITOR required' });

  const activity = await prisma.activity.upsert({
    where: { id: req.params.id },
    create: {
      id: req.params.id,
      stepId,
      userId: req.user.userId,
      type: type || 'OTHER',
      name: name || 'Activité',
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
    update: {
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

  res.json(activity);
});

// PATCH /api/activities/:id — modification partielle (EDITOR+)
router.patch('/:id', async (req, res) => {
  const activity = await prisma.activity.findFirst({
    where: { id: req.params.id },
    select: { stepId: true },
  });

  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  const role = await getUserRoleViaStep(activity.stepId, req.user.userId);
  if (!role) return res.status(403).json({ error: 'Access denied' });
  if (role === 'VIEWER') return res.status(403).json({ error: 'Role EDITOR required' });

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

// DELETE /api/activities/:id — suppression (EDITOR+)
router.delete('/:id', async (req, res) => {
  const activity = await prisma.activity.findFirst({
    where: { id: req.params.id },
    select: { stepId: true },
  });

  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  const role = await getUserRoleViaStep(activity.stepId, req.user.userId);
  if (!role) return res.status(403).json({ error: 'Access denied' });
  if (role === 'VIEWER') return res.status(403).json({ error: 'Role EDITOR required' });

  await prisma.activity.delete({ where: { id: req.params.id } });

  res.status(204).send();
});

module.exports = router;
