'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      restaurant: null,
      isLoading: false,
      error: null,
      unreadOrders: 0,
      unreadRequests: 0,

      setAuth: (token, restaurant) => set({ token, restaurant, error: null }),
      incrementUnread: () => set((state) => ({ unreadOrders: state.unreadOrders + 1 })),
      clearUnread: () => set({ unreadOrders: 0 }),
      incrementUnreadRequests: () => set((state) => ({ unreadRequests: state.unreadRequests + 1 })),
      clearUnreadRequests: () => set({ unreadRequests: 0 }),

      login: async (adminEmail, adminPassword) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await axios.post(`${API}/api/auth/login`, { adminEmail, adminPassword });
          set({ token: data.token, restaurant: data.restaurant, isLoading: false });
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.message || 'Login failed';
          set({ error: msg, isLoading: false });
          return { success: false, message: msg };
        }
      },

      register: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await axios.post(`${API}/api/auth/register`, payload);
          set({ token: data.token, restaurant: data.restaurant, isLoading: false });
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.message || 'Registration failed';
          set({ error: msg, isLoading: false });
          return { success: false, message: msg };
        }
      },

      logout: () => set({ token: null, restaurant: null, error: null }),

      refreshRestaurant: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const { data } = await axios.get(`${API}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          set({ restaurant: data.restaurant });
        } catch {}
      },

      getHeaders: () => {
        const { token } = get();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    { name: 'smartqr-auth', partialize: (s) => ({ token: s.token, restaurant: s.restaurant }) }
  )
);
