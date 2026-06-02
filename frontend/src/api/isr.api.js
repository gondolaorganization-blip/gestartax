import api from './client';

const base = (empresaId) => `/isr/${empresaId}`;
const baseAnticipo = (empresaId) => `/anticipos/${empresaId}`;

export const isrApi = {
  listar:          (empresaId)          => api.get(base(empresaId)),
  obtener:         (empresaId, id)      => api.get(`${base(empresaId)}/${id}`),
  calcularPreview: (empresaId, datos)   => api.post(`${base(empresaId)}/calcular`, datos),
  crear:           (empresaId, datos)   => api.post(base(empresaId), datos),
  actualizar:      (empresaId, id, d)   => api.put(`${base(empresaId)}/${id}`, d),
  proyeccion:      (empresaId, params)  => api.get(`${base(empresaId)}/proyeccion`, { params }),
};

export const anticipoApi = {
  listar:          (empresaId, anio)          => api.get(baseAnticipo(empresaId), { params: { anio } }),
  resumen:         (empresaId, anio)          => api.get(`${baseAnticipo(empresaId)}/resumen`, { params: { anio } }),
  generar:         (empresaId, datos)         => api.post(`${baseAnticipo(empresaId)}/generar`, datos),
  registrarPago:   (empresaId, id, datos)     => api.post(`${baseAnticipo(empresaId)}/${id}/pago`, datos),
  actualizar:      (empresaId, id, datos)     => api.put(`${baseAnticipo(empresaId)}/${id}`, datos),
};
