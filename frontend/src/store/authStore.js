import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_URL from '../api/config';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,

      register: async (email, password, name) => {
        const res = await axios.post(`${API_URL}/api/auth/register`, { email, password, name });
        set({ user: res.data.user, token: res.data.token });
        return res.data;
      },

      login: async (email, password) => {
        console.log('[AUTH] login URL:', `${API_URL}/api/auth/login`);
        try {
          const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
          set({ user: res.data.user, token: res.data.token });
          return res.data;
        } catch (e) {
          console.error('[AUTH] login error:', e.message, e.code, e.response?.status);
          throw e;
        }
      },

      logout: () => {
        set({ user: null, token: null });
      },

      updateUser: (updates) => {
        set((state) => ({ user: { ...state.user, ...updates } }));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
