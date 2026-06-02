import api from './client';

export const dashboardApi = {
  obtener: (empresaId) => api.get(`/dashboard/${empresaId}`),
};
