import api from './client';
const base = (e) => `/tasa-unica/${e}`;
export const tasaUnicaApi = {
  listar:        (e)          => api.get(base(e)),
  generar:       (e, datos)   => api.post(`${base(e)}/generar`, datos),
  crear:         (e, datos)   => api.post(base(e), datos),
  registrarPago: (e, id, d)   => api.patch(`${base(e)}/${id}/pago`, d),
};
