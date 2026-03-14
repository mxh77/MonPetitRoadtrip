import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api.js';

const ROLE_LABELS = { OWNER: 'Organisateur', EDITOR: 'Éditeur', VIEWER: 'Lecteur' };
const ROLE_COLORS = {
  OWNER: 'bg-amber-100 text-amber-800',
  EDITOR: 'bg-blue-100 text-blue-800',
  VIEWER: 'bg-gray-100 text-gray-600',
};
const STATUS_LABELS = {
  DRAFT: 'Brouillon', PLANNED: 'Planifié', ONGOING: 'En cours', COMPLETED: 'Terminé',
};

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HomePage() {
  const navigate = useNavigate();
  const [roadtrips, setRoadtrips] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Appels séparés : une erreur n'en cache pas une autre
    const [rtRes, invRes] = await Promise.allSettled([
      api.get('/roadtrips'),
      api.get('/invitations'),
    ]);
    if (rtRes.status === 'fulfilled') {
      setRoadtrips(rtRes.value.data);
    } else {
      console.error('[roadtrips]', rtRes.reason);
    }
    if (invRes.status === 'fulfilled') {
      setInvitations(invRes.value.data);
    } else {
      console.error('[invitations]', invRes.reason);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  }

  async function acceptInvitation(id) {
    try {
      await api.patch(`/invitations/${id}/accept`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de l\'acceptation');
    }
  }

  async function declineInvitation(id) {
    if (!confirm('Refuser cette invitation ?')) return;
    try {
      await api.patch(`/invitations/${id}/decline`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-serif font-bold text-gray-900">Mon Petit Roadtrip</h1>
          <div className="flex items-center gap-3">
            <Link
              to="/roadtrips/new"
              className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
            >
              + Nouveau roadtrip
            </Link>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800 transition">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">

        {/* Invitations en attente */}
        {invitations.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">
              Invitations en attente ({invitations.length})
            </h2>
            <div className="space-y-3">
              {invitations.map(inv => (
                <div key={inv.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{inv.roadtrip.title}</p>
                    <p className="text-sm text-gray-500">
                      Rôle : <span className="font-medium">{ROLE_LABELS[inv.role]}</span>
                      {inv.roadtrip.startDate && ` · ${formatDate(inv.roadtrip.startDate)}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => acceptInvitation(inv.id)}
                      className="bg-brand text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition"
                    >
                      Accepter
                    </button>
                    <button
                      onClick={() => declineInvitation(inv.id)}
                      className="bg-white border border-gray-300 text-gray-700 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Liste des roadtrips */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Mes roadtrips
          </h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Chargement…</p>
          ) : roadtrips.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">Aucun roadtrip pour le moment.</p>
              <Link to="/roadtrips/new" className="text-brand font-semibold text-sm mt-2 inline-block hover:underline">
                Créer mon premier roadtrip →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {roadtrips.map(rt => (
                <Link
                  key={rt.id}
                  to={`/roadtrips/${rt.id}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition block"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-gray-900 leading-tight">{rt.title}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${ROLE_COLORS[rt.userRole]}`}>
                      {ROLE_LABELS[rt.userRole]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {STATUS_LABELS[rt.status] || rt.status}
                    {rt.startDate && ` · ${formatDate(rt.startDate)}`}
                    {rt.endDate && ` → ${formatDate(rt.endDate)}`}
                  </p>
                  {rt.steps?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">{rt.steps.length} étape{rt.steps.length > 1 ? 's' : ''}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
