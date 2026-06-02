import api from './client';

const base = (empresaId) => `/itbms/${empresaId}`;

export const itbmsApi = {
  listar:          (empresaId, anio)       => api.get(base(empresaId), { params: { anio } }),
  obtener:         (empresaId, id)         => api.get(`${base(empresaId)}/${id}`),
  porPeriodo:      (empresaId, periodo)    => api.get(`${base(empresaId)}/periodo/${periodo}`),
  resumenAnual:    (empresaId, anio)       => api.get(`${base(empresaId)}/resumen`, { params: { anio } }),
  calcularPreview: (empresaId, datos)      => api.post(`${base(empresaId)}/calcular`, datos),
  crear:           (empresaId, datos)      => api.post(base(empresaId), datos),
  actualizar:      (empresaId, id, datos)  => api.put(`${base(empresaId)}/${id}`, datos),
};
