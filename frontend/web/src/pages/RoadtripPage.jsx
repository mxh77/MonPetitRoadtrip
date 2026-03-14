import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api.js';
import StepModal from '../components/StepModal.jsx';
import CollaboratorsPanel from '../components/CollaboratorsPanel.jsx';

const STEP_TYPE_LABELS = { DEPARTURE: 'Départ', STAGE: 'Étape', STOP: 'Arrêt', RETURN: 'Retour' };
const STEP_TYPE_ICONS = { DEPARTURE: '🚀', STAGE: '📍', STOP: '⏸️', RETURN: '🏠' };

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function RoadtripPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [roadtrip, setRoadtrip] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [membersRefreshKey, setMembersRefreshKey] = useState(0);

  // Modal état
  const [stepModal, setStepModal] = useState(null); // null | { mode: 'create'|'edit', step?: {} }

  const canWrite = roadtrip?.userRole === 'OWNER' || roadtrip?.userRole === 'EDITOR';
  const isOwner = roadtrip?.userRole === 'OWNER';

  const fetchRoadtrip = useCallback(async () => {
    try {
      const [rtRes, stepsRes] = await Promise.all([
        api.get(`/roadtrips/${id}`),
        api.get(`/steps?roadtripId=${id}`),
      ]);
      setRoadtrip(rtRes.data);
      setSteps(stepsRes.data);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchRoadtrip(); }, [fetchRoadtrip]);

  function openCreateStep() {
    setStepModal({ mode: 'create' });
  }

  function openEditStep(step) {
    setStepModal({ mode: 'edit', step });
  }

  function onStepSaved() {
    setStepModal(null);
    fetchRoadtrip();
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="text-gray-500 hover:text-gray-800 text-lg shrink-0">‹</Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-serif font-bold text-gray-900 truncate">{roadtrip?.title}</h1>
            {(roadtrip?.startDate || roadtrip?.endDate) && (
              <p className="text-xs text-gray-500">
                {formatDate(roadtrip.startDate)}{roadtrip.endDate ? ` → ${formatDate(roadtrip.endDate)}` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowCollaborators(v => !v)}
              className={`text-sm font-semibold px-3 py-1.5 rounded-lg border transition ${showCollaborators ? 'bg-brand text-white border-brand' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              👥 Membres
            </button>
            {(isOwner || canWrite) && (
              <Link
                to={`/roadtrips/${id}/edit`}
                className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                ✏️ Éditer
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 flex gap-6">
        {/* Contenu principal */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
              Étapes ({steps.length})
            </h2>
            {canWrite && (
              <button
                onClick={openCreateStep}
                className="bg-brand text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition"
              >
                + Étape
              </button>
            )}
          </div>

          {/* Liste étapes */}
          {steps.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">Aucune étape pour le moment.</p>
              {canWrite && (
                <button onClick={openCreateStep} className="text-brand font-semibold text-sm mt-2 hover:underline">
                  Ajouter la première étape →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map(step => (
                <div
                  key={step.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${canWrite ? 'cursor-pointer hover:shadow-md transition' : ''}`}
                  onClick={canWrite ? () => openEditStep(step) : undefined}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{STEP_TYPE_ICONS[step.type] || '📍'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{step.name}</p>
                      {step.location && <p className="text-sm text-gray-500 truncate">{step.location}</p>}
                      {(step.startDate || step.arrivalTime) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {step.startDate ? formatDate(step.startDate) : ''}
                          {step.arrivalTime ? ` · ${step.arrivalTime}` : ''}
                          {step.endDate && step.endDate !== step.startDate ? ` → ${formatDate(step.endDate)}` : ''}
                        </p>
                      )}
                      {step.notes && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{step.notes}</p>}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 mt-0.5">{STEP_TYPE_LABELS[step.type]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panneau collaborateurs */}
        {showCollaborators && (
          <div className="w-80 shrink-0">
            <CollaboratorsPanel key={membersRefreshKey} roadtripId={id} isOwner={isOwner} />
          </div>
        )}
      </div>

      {/* Step modal */}
      {stepModal && (
        <StepModal
          roadtripId={id}
          step={stepModal.step}
          mode={stepModal.mode}
          onClose={() => setStepModal(null)}
          onSaved={onStepSaved}
        />
      )}
    </div>
  );
}
