import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const SUPER_BASE = `${API}/api/sx-control`;

// Set a cookie so Next.js middleware can check auth at the edge
const setSessionCookie = (token) => {
  if (typeof document === 'undefined') return;
  if (token) {
    // 8h expiry, SameSite=Strict for CSRF protection
    document.cookie = `sq-sx-token=${token}; path=/; max-age=28800; SameSite=Strict`;
  } else {
    document.cookie = `sq-sx-token=; path=/; max-age=0`;
  }
};

export const useSuperStore = create(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await axios.post(`${SUPER_BASE}/auth/login`, { email, password });
          setSessionCookie(data.token);
          set({ token: data.token, admin: data.admin, isLoading: false, error: null });
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.message || 'Login failed';
          set({ error: msg, isLoading: false });
          return { success: false, message: msg };
        }
      },

      logout: async () => {
        const { token } = get();
        if (token) {
          try {
            await axios.post(`${SUPER_BASE}/auth/logout`, {}, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch {}
        }
        setSessionCookie(null);
        set({ token: null, admin: null, error: null });
      },

      // Re-hydrate cookie on app load (in case localStorage exists but cookie is missing)
      rehydrateCookie: () => {
        const { token } = get();
        if (token) setSessionCookie(token);
      },

      superClient: () => {
        const { token } = get();
        return axios.create({
          baseURL: SUPER_BASE,
          headers: { Authorization: `Bearer ${token}` },
        });
      },
    }),
    {
      name: 'sq-sx-store',
      partialize: (s) => ({ token: s.token, admin: s.admin }),
      onRehydrateStorage: () => (state) => {
        // After Zustand rehydrates from localStorage, re-set the cookie
        if (state?.token) setSessionCookie(state.token);
      },
    }
  )
);
