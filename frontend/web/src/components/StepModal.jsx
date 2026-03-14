import React, { useState, useEffect } from 'react';
import api from '../api.js';

const STEP_TYPES = [
  { value: 'DEPARTURE', label: 'Départ 🚀' },
  { value: 'STAGE', label: 'Étape 📍' },
  { value: 'STOP', label: 'Arrêt ⏸️' },
  { value: 'RETURN', label: 'Retour 🏠' },
];

export default function StepModal({ roadtripId, step, mode, onClose, onSaved }) {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({
    name: '',
    type: 'STAGE',
    location: '',
    startDate: '',
    endDate: '',
    arrivalTime: '',
    departureTime: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && step) {
      setForm({
        name: step.name || '',
        type: step.type || 'STEP',
        location: step.location || '',
        startDate: step.startDate ? step.startDate.substring(0, 10) : '',
        endDate: step.endDate ? step.endDate.substring(0, 10) : '',
        arrivalTime: step.arrivalTime || '',
        departureTime: step.departureTime || '',
        notes: step.notes || '',
      });
    }
  }, [isEdit, step]);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        roadtripId,
        name: form.name,
        type: form.type,
        location: form.location || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        arrivalTime: form.arrivalTime || null,
        departureTime: form.departureTime || null,
        notes: form.notes || null,
      };
      if (isEdit) {
        await api.patch(`/steps/${step.id}`, payload);
      } else {
        await api.post('/steps', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer l'étape "${step.name}" ?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/steps/${step.id}`);
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression');
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Modifier l\'étape' : 'Nouvelle étape'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={set('name')}
              placeholder="Ex: Arrivée à Reykjavik"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={set('type')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {STEP_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
            <input
              type="text"
              value={form.location}
              onChange={set('location')}
              placeholder="Ville, adresse…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
              <input type="date" value={form.startDate} onChange={set('startDate')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
              <input type="date" value={form.endDate} onChange={set('endDate')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure d'arrivée</label>
              <input type="time" value={form.arrivalTime} onChange={set('arrivalTime')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure de départ</label>
              <input type="time" value={form.departureTime} onChange={set('departureTime')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Infos complémentaires…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-600 text-sm font-semibold hover:underline disabled:opacity-50"
              >
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm bg-brand text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50">
                {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
