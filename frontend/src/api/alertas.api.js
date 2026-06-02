import api from './client';

const base = (empresaId) => `/alertas/${empresaId}`;

export const alertasApi = {
  listar:           (empresaId, params)  => api.get(base(empresaId), { params }),
  conteo:           (empresaId)          => api.get(`${base(empresaId)}/conteo`),
  crearManual:      (empresaId, datos)   => api.post(base(empresaId), datos),
  marcarLeida:      (empresaId, id)      => api.patch(`${base(empresaId)}/${id}/leida`),
  marcarTodasLeidas:(empresaId)          => api.patch(`${base(empresaId)}/todas-leidas`),
  archivar:         (empresaId, id)      => api.patch(`${base(empresaId)}/${id}/archivar`),
};
