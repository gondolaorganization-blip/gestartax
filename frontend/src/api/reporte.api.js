import api from './client';

export const reporteApi = {
  itbms: (empresaId, anio, formato = 'pdf') =>
    api.get(`/reportes/${empresaId}/itbms`, { params: { anio, formato }, responseType: 'blob' }),
  isr: (empresaId, anio, formato = 'pdf') =>
    api.get(`/reportes/${empresaId}/isr`, { params: { anio, formato }, responseType: 'blob' }),
  posicionFiscal: (empresaId, anio, formato = 'pdf') =>
    api.get(`/reportes/${empresaId}/posicion`, { params: { anio, formato }, responseType: 'blob' }),
};

export function descargarArchivo(blob, nombre) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Alias retrocompatible
export const descargarPdf = descargarArchivo;
