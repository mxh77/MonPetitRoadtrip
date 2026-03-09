const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { getUserRoleViaStep } = require('../lib/roleHelpers');

router.use(auth);

// POST /api/accommodations — écriture : EDITOR+
router.post('/', async (req, res) => {
  const { stepId, type, name, address, checkIn, checkOut, bookingRef, bookingUrl, pricePerNight, currency, notes, status } = req.body;

  if (!stepId || !name) {
    return res.status(400).json({ error: 'stepId and name are required' });
  }

  const role = await getUserRoleViaStep(stepId, req.user.userId);
  if (!role) return res.status(404).json({ error: 'Step not found' });
  if (role === 'VIEWER') return res.status(403).json({ error: 'Role EDITOR required' });

  // Check no accommodation already exists for this step
  const existing = await prisma.accommodation.findUnique({ where: { stepId } });
  if (existing) {
    return res.status(409).json({ error: 'An accommodation already exists for this step' });
  }

  const accommodation = await prisma.accommodation.create({
    data: {
      stepId,
      userId: req.user.userId,
      type: type || 'HOTEL',
      name,
      address: address || null,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      bookingRef: bookingRef || null,
      bookingUrl: bookingUrl || null,
      pricePerNight: pricePerNight ?? null,
      currency: currency || 'EUR',
      notes: notes || null,
      status: status || 'PLANNED',
    },
  });

  res.status(201).json(accommodation);
});

// PUT /api/accommodations/:id — upsert (EDITOR+, ID généré côté client)
router.put('/:id', async (req, res) => {
  const { stepId, type, name, address, checkIn, checkOut, bookingRef, bookingUrl, pricePerNight, currency, notes, status } = req.body;

  if (!stepId) return res.status(400).json({ error: 'stepId is required' });

  const role = await getUserRoleViaStep(stepId, req.user.userId);
  if (!role) return res.status(404).json({ error: 'Step not found' });
  if (role === 'VIEWER') return res.status(403).json({ error: 'Role EDITOR required' });

  const accommodation = await prisma.accommodation.upsert({
    where: { id: req.params.id },
    create: {
      id: req.params.id,
      stepId,
      userId: req.user.userId,
      type: type || 'HOTEL',
      name: name || 'Hébergement',
      address: address || null,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      bookingRef: bookingRef || null,
      bookingUrl: bookingUrl || null,
      pricePerNight: pricePerNight ?? null,
      currency: currency || 'EUR',
      notes: notes || null,
      status: status || 'PLANNED',
    },
    update: {
      ...(type !== undefined && { type }),
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(checkIn !== undefined && { checkIn: checkIn ? new Date(checkIn) : null }),
      ...(checkOut !== undefined && { checkOut: checkOut ? new Date(checkOut) : null }),
      ...(bookingRef !== undefined && { bookingRef }),
      ...(bookingUrl !== undefined && { bookingUrl }),
      ...(pricePerNight !== undefined && { pricePerNight }),
      ...(currency !== undefined && { currency }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
    },
  });

  res.json(accommodation);
});

// PATCH /api/accommodations/:id — modification partielle (EDITOR+)
router.patch('/:id', async (req, res) => {
  const accommodation = await prisma.accommodation.findFirst({
    where: { id: req.params.id },
    select: { stepId: true },
  });

  if (!accommodation) return res.status(404).json({ error: 'Accommodation not found' });

  const role = await getUserRoleViaStep(accommodation.stepId, req.user.userId);
  if (!role) return res.status(403).json({ error: 'Access denied' });
  if (role === 'VIEWER') return res.status(403).json({ error: 'Role EDITOR required' });

  const { type, name, address, checkIn, checkOut, bookingRef, bookingUrl, pricePerNight, currency, notes, status } = req.body;

  const updated = await prisma.accommodation.update({
    where: { id: req.params.id },
    data: {
      ...(type !== undefined && { type }),
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(checkIn !== undefined && { checkIn: checkIn ? new Date(checkIn) : null }),
      ...(checkOut !== undefined && { checkOut: checkOut ? new Date(checkOut) : null }),
      ...(bookingRef !== undefined && { bookingRef }),
      ...(bookingUrl !== undefined && { bookingUrl }),
      ...(pricePerNight !== undefined && { pricePerNight }),
      ...(currency !== undefined && { currency }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
    },
  });

  res.json(updated);
});

// DELETE /api/accommodations/:id — suppression (EDITOR+)
router.delete('/:id', async (req, res) => {
  const accommodation = await prisma.accommodation.findFirst({
    where: { id: req.params.id },
    select: { stepId: true },
  });

  if (!accommodation) return res.status(404).json({ error: 'Accommodation not found' });

  const role = await getUserRoleViaStep(accommodation.stepId, req.user.userId);
  if (!role) return res.status(403).json({ error: 'Access denied' });
  if (role === 'VIEWER') return res.status(403).json({ error: 'Role EDITOR required' });

  await prisma.accommodation.delete({ where: { id: req.params.id } });

  res.status(204).send();
});

module.exports = router;
