import api from './client';

const base = (empresaId) => `/planilla/${empresaId}`;

export const planillaApi = {
  listarEmpleados:  (empresaId)           => api.get(`${base(empresaId)}/empleados`),
  crearEmpleado:    (empresaId, datos)    => api.post(`${base(empresaId)}/empleados`, datos),
  actualizarEmpleado:(empresaId, id, datos)=> api.put(`${base(empresaId)}/empleados/${id}`, datos),

  listarPeriodos:   (empresaId, anio)     => api.get(`${base(empresaId)}/periodos`, { params: { anio } }),
  obtenerPeriodo:   (empresaId, id)       => api.get(`${base(empresaId)}/periodos/${id}`),
  crearPeriodo:     (empresaId, datos)    => api.post(`${base(empresaId)}/periodos`, datos),
  cambiarEstado:    (empresaId, id, estado) => api.patch(`${base(empresaId)}/periodos/${id}/estado`, { estado }),
};
