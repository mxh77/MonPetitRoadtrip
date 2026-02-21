/**
 * Écritures offline-first dans SQLite local via PowerSync.
 * PowerSync gère la queue CRUD et appelle uploadData() quand le réseau revient.
 */
import { db } from './db';

// Génère un ID type CUID localement (sans dépendance externe)
const generateId = () =>
  'c' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

const now = () => new Date().toISOString();

// ─── Roadtrips ────────────────────────────────────────────────────────────────

export async function localCreateRoadtrip({ title, startDate, endDate, status, coverPhotoUrl }, userId) {
  const id = generateId();
  const createdAt = now();
  await db.execute(
    `INSERT INTO roadtrips (id, title, startDate, endDate, status, coverPhotoUrl, userId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, title, startDate ?? null, endDate ?? null, status ?? 'DRAFT', coverPhotoUrl ?? null, userId, createdAt, createdAt]
  );
  return { id, title, startDate, endDate, status: status ?? 'DRAFT', coverPhotoUrl, userId, createdAt, updatedAt: createdAt };
}

export async function localUpdateRoadtrip(id, data) {
  const fields = [];
  const values = [];
  if (data.title !== undefined)        { fields.push('title = ?');        values.push(data.title); }
  if (data.startDate !== undefined)    { fields.push('startDate = ?');    values.push(data.startDate); }
  if (data.endDate !== undefined)      { fields.push('endDate = ?');      values.push(data.endDate); }
  if (data.status !== undefined)       { fields.push('status = ?');       values.push(data.status); }
  if (data.coverPhotoUrl !== undefined){ fields.push('coverPhotoUrl = ?');values.push(data.coverPhotoUrl); }
  fields.push('updatedAt = ?');
  values.push(now(), id);
  await db.execute(`UPDATE roadtrips SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function localDeleteRoadtrip(id) {
  // Supprimer en cascade manuellement (SQLite local n'a pas de FK cascade)
  const steps = await db.getAll('SELECT id FROM steps WHERE roadtripId = ?', [id]);
  for (const step of steps) {
    await db.execute('DELETE FROM activities WHERE stepId = ?', [step.id]);
    await db.execute('DELETE FROM accommodations WHERE stepId = ?', [step.id]);
  }
  await db.execute('DELETE FROM steps WHERE roadtripId = ?', [id]);
  await db.execute('DELETE FROM roadtrips WHERE id = ?', [id]);
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export async function localCreateStep({
  roadtripId, type, name, location, latitude, longitude,
  startDate, endDate, arrivalTime, departureTime, notes, photoUrl, order,
}, userId) {
  const id = generateId();
  const createdAt = now();
  await db.execute(
    `INSERT INTO steps (id, roadtripId, userId, type, name, location, latitude, longitude,
      startDate, endDate, arrivalTime, departureTime, notes, photoUrl, "order", createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, roadtripId, userId, type, name, location ?? null, latitude ?? null, longitude ?? null,
     startDate ?? null, endDate ?? null, arrivalTime ?? null, departureTime ?? null,
     notes ?? null, photoUrl ?? null, order ?? 0, createdAt, createdAt]
  );
  return {
    id, roadtripId, userId, type, name, location, latitude, longitude,
    startDate, endDate, arrivalTime, departureTime, notes, photoUrl,
    order: order ?? 0, createdAt, updatedAt: createdAt,
    accommodation: null, activities: [],
  };
}

export async function localUpdateStep(id, data) {
  const fields = [];
  const values = [];
  const map = ['type','name','location','latitude','longitude','startDate','endDate',
                'arrivalTime','departureTime','notes','photoUrl'];
  for (const key of map) {
    if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]); }
  }
  if (data.order !== undefined) { fields.push('"order" = ?'); values.push(data.order); }
  fields.push('updatedAt = ?');
  values.push(now(), id);
  await db.execute(`UPDATE steps SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function localDeleteStep(id) {
  await db.execute('DELETE FROM activities WHERE stepId = ?', [id]);
  await db.execute('DELETE FROM accommodations WHERE stepId = ?', [id]);
  await db.execute('DELETE FROM steps WHERE id = ?', [id]);
}

// ─── Activities ───────────────────────────────────────────────────────────────

export async function localCreateActivity({
  stepId, type, name, location, startTime, endTime,
  bookingRef, bookingUrl, cost, currency, notes, status, order,
}, userId) {
  const id = generateId();
  const createdAt = now();
  await db.execute(
    `INSERT INTO activities (id, stepId, userId, type, name, location, startTime, endTime,
      bookingRef, bookingUrl, cost, currency, notes, status, "order", createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, stepId, userId, type ?? 'OTHER', name, location ?? null,
     startTime ?? null, endTime ?? null, bookingRef ?? null, bookingUrl ?? null,
     cost ?? null, currency ?? 'EUR', notes ?? null, status ?? 'PLANNED',
     order ?? 0, createdAt, createdAt]
  );
  return {
    id, stepId, userId, type: type ?? 'OTHER', name, location,
    startTime, endTime, bookingRef, bookingUrl, cost, currency: currency ?? 'EUR',
    notes, status: status ?? 'PLANNED', order: order ?? 0, createdAt, updatedAt: createdAt,
  };
}

export async function localDeleteActivity(id) {
  await db.execute('DELETE FROM activities WHERE id = ?', [id]);
}

// ─── Accommodations ───────────────────────────────────────────────────────────

export async function localCreateAccommodation({
  stepId, type, name, address, checkIn, checkOut,
  bookingRef, bookingUrl, pricePerNight, currency, notes, status,
}, userId) {
  const id = generateId();
  const createdAt = now();
  await db.execute(
    `INSERT INTO accommodations (id, stepId, userId, type, name, address, checkIn, checkOut,
      bookingRef, bookingUrl, pricePerNight, currency, notes, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, stepId, userId, type ?? 'HOTEL', name, address ?? null,
     checkIn ?? null, checkOut ?? null, bookingRef ?? null, bookingUrl ?? null,
     pricePerNight ?? null, currency ?? 'EUR', notes ?? null, status ?? 'PLANNED',
     createdAt, createdAt]
  );
  return {
    id, stepId, userId, type: type ?? 'HOTEL', name, address,
    checkIn, checkOut, bookingRef, bookingUrl, pricePerNight,
    currency: currency ?? 'EUR', notes, status: status ?? 'PLANNED',
    createdAt, updatedAt: createdAt,
  };
}
