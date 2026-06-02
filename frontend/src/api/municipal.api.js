import api from './client';
const base = (e) => `/municipal/${e}`;
export const municipalApi = {
  listar:         (e)              => api.get(base(e)),
  crear:          (e, datos)       => api.post(base(e), datos),
  actualizar:     (e, id, datos)   => api.put(`${base(e)}/${id}`, datos),
  crearPago:      (e, oblId, d)    => api.post(`${base(e)}/${oblId}/pagos`, d),
  registrarPago:  (e, oblId, pId)  => api.patch(`${base(e)}/${oblId}/pagos/${pId}/pagar`, {}),
};
