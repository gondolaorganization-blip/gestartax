export function formatUSD(valor) {
  if (valor === null || valor === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(valor));
}

export function formatNumero(valor) {
  if (valor === null || valor === undefined) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor));
}

export const MESES_NOMBRE = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export function nombreMes(mes) {
  return MESES_NOMBRE[mes - 1] || '';
}

export function formatFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-PA', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function periodoLabel(periodo) {
  if (!periodo) return '';
  const [anio, mes] = periodo.split('-');
  return `${MESES_NOMBRE[parseInt(mes) - 1]} ${anio}`;
}
