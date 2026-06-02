import api from './client';

export const calendarioApi = {
  generar: (empresaId, anio) =>
    api.post(`/calendario/${empresaId}/generar`, null, { params: { anio } }),

  anual: (empresaId, anio) =>
    api.get(`/calendario/${empresaId}/anual`, { params: { anio } }),

  mes: (empresaId, anio, mes) =>
    api.get(`/calendario/${empresaId}/mes/${mes}`, { params: { anio } }),

  proximos: (empresaId, dias = 30) =>
    api.get(`/calendario/${empresaId}/proximos`, { params: { dias } }),
};

export const alertasApi = {
  listar: (empresaId, soloNoLeidas = false) =>
    api.get(`/alertas/${empresaId}`, { params: { noLeidas: soloNoLeidas } }),

  marcarLeida: (empresaId, alertaId) =>
    api.patch(`/alertas/${empresaId}/${alertaId}/leida`),

  marcarTodasLeidas: (empresaId) =>
    api.patch(`/alertas/${empresaId}/todas-leidas`),
};
