const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const checkMemberRole = require('../middleware/checkMemberRole');

// All roadtrip routes require authentication
router.use(auth);

// GET /api/roadtrips — roadtrips owned + shared
router.get('/', async (req, res) => {
  const userId = req.user.userId;

  const ownedRoadtrips = await prisma.roadtrip.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        select: { id: true, type: true, name: true, location: true, startDate: true, order: true },
      },
    },
  });

  const memberships = await prisma.roadtripMember.findMany({
    where: { userId, status: 'ACCEPTED' },
    include: {
      roadtrip: {
        include: {
          steps: {
            orderBy: { order: 'asc' },
            select: { id: true, type: true, name: true, location: true, startDate: true, order: true },
          },
        },
      },
    },
  });

  const ownedWithRole = ownedRoadtrips.map(r => ({ ...r, userRole: 'OWNER' }));
  const sharedWithRole = memberships.map(m => ({ ...m.roadtrip, userRole: m.role }));

  // Dédupliquer : si l'utilisateur est à la fois owner ET membre (cas rare de migration),
  // on conserve uniquement la version owner pour éviter les doublons dans la liste.
  const allIds = new Set(ownedWithRole.map(r => r.id));
  const uniqueShared = sharedWithRole.filter(r => !allIds.has(r.id));

  const all = [...ownedWithRole, ...uniqueShared].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  res.json(all);
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

// GET /api/roadtrips/:id — accessible par owner et membres ACCEPTED
router.get('/:id', async (req, res) => {
  const userId = req.user.userId;
  const roadtrip = await prisma.roadtrip.findUnique({
    where: { id: req.params.id },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        include: {
          accommodation: true,
          activities: { orderBy: { order: 'asc' } },
        },
      },
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
    },
  });

  if (!roadtrip) return res.status(404).json({ error: 'Roadtrip not found' });

  if (roadtrip.userId === userId) {
    return res.json({ ...roadtrip, userRole: 'OWNER' });
  }

  const member = roadtrip.members.find(m => m.userId === userId && m.status === 'ACCEPTED');
  if (!member) return res.status(403).json({ error: 'Access denied' });

  res.json({ ...roadtrip, userRole: member.role });
});

// PUT /api/roadtrips/:id — upsert (OWNER uniquement, ID généré côté client pour l'offline-first)
router.put('/:id', checkMemberRole('OWNER'), async (req, res) => {
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

// PATCH /api/roadtrips/:id — modification partielle (EDITOR+)
router.patch('/:id', checkMemberRole('EDITOR'), async (req, res) => {
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

// DELETE /api/roadtrips/:id — suppression (OWNER uniquement)
router.delete('/:id', checkMemberRole('OWNER'), async (req, res) => {
  await prisma.roadtrip.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = router;
