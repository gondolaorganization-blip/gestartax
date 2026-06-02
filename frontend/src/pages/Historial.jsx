import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { pagoApi } from '../api/pago.api';
import { formatUSD, formatFecha } from '../utils/format';

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: 5 }, (_, i) => ANIO_ACTUAL - i);

const TIPO_CONFIG = {
  ITBMS:             { label: 'ITBMS',              color: 'bg-blue-100   text-blue-700',   dot: 'bg-blue-500'   },
  ISR:               { label: 'ISR',                color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  ANTICIPO_ISR:      { label: 'Anticipo ISR',       color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  CSS_SEA:           { label: 'CSS / SEA',          color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  AVISO_OPERACION:   { label: 'Aviso de Operación', color: 'bg-teal-100   text-teal-700',   dot: 'bg-teal-500'   },
  IMPUESTO_INMUEBLE: { label: 'Inmueble',           color: 'bg-green-100  text-green-700',  dot: 'bg-green-500'  },
  RETENCION:         { label: 'Retención',          color: 'bg-red-100    text-red-700',    dot: 'bg-red-500'    },
};

const TIPOS_FILTRO = [
  { key: null, label: 'Todos' },
  ...Object.entries(TIPO_CONFIG).map(([key, cfg]) => ({ key, label: cfg.label })),
];

function etiquetaPago(pago) {
  if (pago.anticipo) {
    return `Anticipo ISR — Cuota ${pago.anticipo.cuota?.replace('_', ' ')} ${pago.anticipo.anio}`;
  }
  if (pago.obligacion) {
    return [
      TIPO_CONFIG[pago.obligacion.tipo]?.label || pago.obligacion.tipo,
      pago.obligacion.descripcion,
      pago.obligacion.periodoReferencia,
    ].filter(Boolean).join(' — ');
  }
  return 'Pago fiscal';
}

function tipoPago(pago) {
  if (pago.anticipo) return 'ANTICIPO_ISR';
  return pago.obligacion?.tipo || null;
}

export default function Historial() {
  const { empresaId } = useParams();
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [filtroTipo, setFiltroTipo] = useState(null);

  const { data: pagos = [], isLoading } = useQuery({
    queryKey: ['historial-pagos', empresaId, anio],
    queryFn: () => pagoApi.listar(empresaId, { anio }).then((r) => r.data),
    enabled: !!empresaId,
  });

  const pagosFiltrados = filtroTipo
    ? pagos.filter((p) => tipoPago(p) === filtroTipo)
    : pagos;

  const totalAnio = pagosFiltrados.reduce((s, p) => s + Number(p.monto), 0);

  // Agrupar por mes
  const grupos = pagosFiltrados.reduce((acc, pago) => {
    const d = new Date(pago.fecha);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = { label, pagos: [] };
    acc[key].pagos.push(pago);
    return acc;
  }, {});

  const mesesTotales = Object.entries(grupos).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Historial de pagos</h1>
        <p className="text-slate-500 text-sm mt-1">Registro de todos los pagos fiscales realizados.</p>
      </div>

      {/* Selector de año + total */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {ANIOS.map((a) => (
            <button key={a} onClick={() => setAnio(a)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${anio === a ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {a}
            </button>
          ))}
        </div>
        {pagosFiltrados.length > 0 && (
          <div className="text-sm text-slate-600">
            Total pagado: <span className="font-bold text-slate-900">{formatUSD(totalAnio)}</span>
            <span className="text-slate-400 ml-2">({pagosFiltrados.length} pago{pagosFiltrados.length !== 1 ? 's' : ''})</span>
          </div>
        )}
      </div>

      {/* Filtro por tipo */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {TIPOS_FILTRO.map((f) => (
          <button key={f.key ?? 'todos'} onClick={() => setFiltroTipo(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtroTipo === f.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Cargando historial...</div>}

      {!isLoading && pagosFiltrados.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500 font-medium">Sin pagos registrados</p>
          <p className="text-slate-400 text-sm mt-1">
            {filtroTipo
              ? `No hay pagos de tipo "${TIPO_CONFIG[filtroTipo]?.label}" en ${anio}`
              : `No se encontraron pagos para el año ${anio}`}
          </p>
        </div>
      )}

      {/* Tabla agrupada por mes */}
      {mesesTotales.length > 0 && (
        <div className="space-y-6">
          {mesesTotales.map(([key, grupo]) => {
            const subtotal = grupo.pagos.reduce((s, p) => s + Number(p.monto), 0);
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-700 capitalize">{grupo.label}</h2>
                  <span className="text-sm font-medium text-slate-600">{formatUSD(subtotal)}</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {grupo.pagos.map((pago, idx) => {
                    const tipo = tipoPago(pago);
                    const cfg = tipo ? (TIPO_CONFIG[tipo] || null) : null;
                    const label = etiquetaPago(pago);
                    return (
                      <div key={pago.id} className={`flex items-center gap-4 px-4 py-3 ${idx < grupo.pagos.length - 1 ? 'border-b border-slate-100' : ''}`}>
                        {/* Dot de tipo */}
                        <div className={`w-2 h-2 rounded-full shrink-0 ${cfg?.dot || 'bg-slate-400'}`} />

                        {/* Descripción */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 truncate">{label}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                            <span>{formatFecha(pago.fecha)}</span>
                            {pago.banco && <span>• {pago.banco}</span>}
                            {pago.referenciaBanco && <span>• Ref: {pago.referenciaBanco}</span>}
                          </div>
                        </div>

                        {/* Badge tipo */}
                        {cfg && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        )}

                        {/* Monto */}
                        <span className="text-sm font-bold text-slate-900 shrink-0 w-24 text-right">
                          {formatUSD(pago.monto)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Total final */}
          <div className="flex items-center justify-between py-3 border-t-2 border-slate-200 mt-2">
            <span className="text-sm font-bold text-slate-700">Total {anio}</span>
            <span className="text-lg font-bold text-slate-900">{formatUSD(totalAnio)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
