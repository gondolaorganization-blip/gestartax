import api from './client';

export const pagoApi = {
  listar: (empresaId, params) => api.get(`/pagos/${empresaId}`, { params }),
  registrar: (empresaId, data) => api.post(`/pagos/${empresaId}`, data),
};
