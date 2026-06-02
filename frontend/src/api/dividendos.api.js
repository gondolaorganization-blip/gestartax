import api from './client';
const base = (e) => `/dividendos/${e}`;
export const dividendosApi = {
  listar:    (e)        => api.get(base(e)),
  crear:     (e, datos) => api.post(base(e), datos),
  actualizar:(e, id, d) => api.put(`${base(e)}/${id}`, d),
};
