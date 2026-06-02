import api from './client';

export const inmuebleApi = {
  listar: (empresaId) => api.get(`/empresas/${empresaId}/inmuebles`),
  crear: (empresaId, data) => api.post(`/empresas/${empresaId}/inmuebles`, data),
  actualizar: (empresaId, id, data) => api.put(`/empresas/${empresaId}/inmuebles/${id}`, data),
  generarCuotas: (empresaId, id, anio) => api.post(`/empresas/${empresaId}/inmuebles/${id}/cuotas/generar`, { anio }),
  pagarCuota: (empresaId, propiedadId, cuotaId, fechaPago) =>
    api.put(`/empresas/${empresaId}/inmuebles/${propiedadId}/cuotas/${cuotaId}/pagar`, { fechaPago }),
};
