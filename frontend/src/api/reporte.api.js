import api from './client';

export const reporteApi = {
  itbms: (empresaId, anio) =>
    api.get(`/reportes/${empresaId}/itbms`, { params: { anio }, responseType: 'blob' }),
  isr: (empresaId, anio) =>
    api.get(`/reportes/${empresaId}/isr`, { params: { anio }, responseType: 'blob' }),
  posicionFiscal: (empresaId, anio) =>
    api.get(`/reportes/${empresaId}/posicion`, { params: { anio }, responseType: 'blob' }),
};

export function descargarPdf(blob, nombre) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
