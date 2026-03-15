import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api.js';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminFeedbackPage() {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/beta/feedbacks');
      setFeedbacks(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des feedbacks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-800 transition">
            ← Accueil
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-2xl font-serif font-bold text-gray-900">Mon Petit Roadtrip</span>
          <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">Admin</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-800 transition"
        >
          Déconnexion
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feedbacks beta</h1>
            <p className="text-sm text-gray-500 mt-1">{feedbacks.length} retour{feedbacks.length !== 1 ? 's' : ''} reçu{feedbacks.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={fetchFeedbacks}
            className="text-sm bg-white border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition"
          >
            ↻ Actualiser
          </button>
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-400">Chargement...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {!loading && !error && feedbacks.length === 0 && (
          <div className="text-center py-20 text-gray-400">Aucun feedback pour le moment.</div>
        )}

        {!loading && feedbacks.length > 0 && (
          <div className="space-y-4">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 whitespace-pre-wrap text-sm leading-relaxed">{fb.text}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                  <span className="font-medium text-gray-600">
                    {fb.user?.name || fb.user?.email || 'Utilisateur inconnu'}
                  </span>
                  <span>·</span>
                  <span>{fb.user?.email}</span>
                  <span>·</span>
                  <span>{formatDate(fb.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
