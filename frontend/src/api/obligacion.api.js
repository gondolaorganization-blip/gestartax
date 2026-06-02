import api from './client';

export const obligacionApi = {
  listar: (empresaId, params) => api.get(`/obligaciones/${empresaId}`, { params }),
  actualizarEstado: (empresaId, id, data) => api.put(`/obligaciones/${empresaId}/${id}/estado`, data),
};
