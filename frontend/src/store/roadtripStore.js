import { create } from 'zustand';
import client from '../api/client';

export const useRoadtripStore = create((set, get) => ({
  roadtrips: [],
  currentRoadtrip: null,
  loading: false,
  error: null,

  // ─── Roadtrips ─────────────────────────────────────────────────────────────

  fetchRoadtrips: async () => {
    set({ loading: true, error: null });
    try {
      const res = await client.get('/api/roadtrips');
      set({ roadtrips: res.data, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.error || 'Erreur de chargement', loading: false });
    }
  },

  fetchRoadtrip: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await client.get(`/api/roadtrips/${id}`);
      set({ currentRoadtrip: res.data, loading: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Erreur de chargement', loading: false });
      return null;
    }
  },

  createRoadtrip: async (data) => {
    const res = await client.post('/api/roadtrips', data);
    set((state) => ({ roadtrips: [res.data, ...state.roadtrips] }));
    return res.data;
  },

  updateRoadtrip: async (id, data) => {
    const res = await client.patch(`/api/roadtrips/${id}`, data);
    set((state) => ({
      roadtrips: state.roadtrips.map((r) => (r.id === id ? res.data : r)),
      currentRoadtrip: state.currentRoadtrip?.id === id ? res.data : state.currentRoadtrip,
    }));
    return res.data;
  },

  deleteRoadtrip: async (id) => {
    await client.delete(`/api/roadtrips/${id}`);
    set((state) => ({
      roadtrips: state.roadtrips.filter((r) => r.id !== id),
      currentRoadtrip: state.currentRoadtrip?.id === id ? null : state.currentRoadtrip,
    }));
  },

  // ─── Steps ─────────────────────────────────────────────────────────────────

  createStep: async (data) => {
    const res = await client.post('/api/steps', data);
    set((state) => {
      if (!state.currentRoadtrip) return {};
      return {
        currentRoadtrip: {
          ...state.currentRoadtrip,
          steps: [...(state.currentRoadtrip.steps || []), res.data].sort(
            (a, b) => a.order - b.order
          ),
        },
      };
    });
    return res.data;
  },

  updateStep: async (id, data) => {
    const res = await client.patch(`/api/steps/${id}`, data);
    set((state) => {
      if (!state.currentRoadtrip) return {};
      return {
        currentRoadtrip: {
          ...state.currentRoadtrip,
          steps: state.currentRoadtrip.steps.map((s) => (s.id === id ? res.data : s)),
        },
      };
    });
    return res.data;
  },

  deleteStep: async (id) => {
    await client.delete(`/api/steps/${id}`);
    set((state) => {
      if (!state.currentRoadtrip) return {};
      return {
        currentRoadtrip: {
          ...state.currentRoadtrip,
          steps: state.currentRoadtrip.steps.filter((s) => s.id !== id),
        },
      };
    });
  },

  // ─── Activities ────────────────────────────────────────────────────────────

  createActivity: async (data) => {
    const res = await client.post('/api/activities', data);
    set((state) => {
      if (!state.currentRoadtrip) return {};
      return {
        currentRoadtrip: {
          ...state.currentRoadtrip,
          steps: state.currentRoadtrip.steps.map((s) =>
            s.id === data.stepId
              ? { ...s, activities: [...(s.activities || []), res.data] }
              : s
          ),
        },
      };
    });
    return res.data;
  },

  deleteActivity: async (id, stepId) => {
    await client.delete(`/api/activities/${id}`);
    set((state) => {
      if (!state.currentRoadtrip) return {};
      return {
        currentRoadtrip: {
          ...state.currentRoadtrip,
          steps: state.currentRoadtrip.steps.map((s) =>
            s.id === stepId
              ? { ...s, activities: s.activities.filter((a) => a.id !== id) }
              : s
          ),
        },
      };
    });
  },

  // ─── Accommodation ─────────────────────────────────────────────────────────

  createAccommodation: async (data) => {
    const res = await client.post('/api/accommodations', data);
    set((state) => {
      if (!state.currentRoadtrip) return {};
      return {
        currentRoadtrip: {
          ...state.currentRoadtrip,
          steps: state.currentRoadtrip.steps.map((s) =>
            s.id === data.stepId ? { ...s, accommodation: res.data } : s
          ),
        },
      };
    });
    return res.data;
  },

  clearCurrentRoadtrip: () => set({ currentRoadtrip: null }),
}));
