import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      usuario: null,
      empresaActual: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        set({ usuario: data.usuario, isAuthenticated: true });
        return data;
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ usuario: null, empresaActual: null, isAuthenticated: false });
      },

      setEmpresaActual: (empresa) => set({ empresaActual: empresa }),
    }),
    {
      name: 'taxgestar-auth',
      partialize: (state) => ({ usuario: state.usuario, empresaActual: state.empresaActual, isAuthenticated: state.isAuthenticated }),
    }
  )
);
