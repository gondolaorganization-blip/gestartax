import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarioApi } from '../api/calendario.api';
import { ChevronLeft, ChevronRight, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const TIPOS_CONFIG = {
  ITBMS:             { label: 'ITBMS',         color: 'bg-blue-100 text-blue-800 border-blue-200' },
  ISR:               { label: 'ISR Anual',      color: 'bg-purple-100 text-purple-800 border-purple-200' },
  ANTICIPO_ISR:      { label: 'Anticipo ISR',   color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  CSS_SEA:           { label: 'CSS/SEA',        color: 'bg-green-100 text-green-800 border-green-200' },
  AVISO_OPERACION:   { label: 'Aviso Op.',      color: 'bg-orange-100 text-orange-800 border-orange-200' },
  IMPUESTO_INMUEBLE: { label: 'Inmueble',       color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  RETENCION:         { label: 'Retención',      color: 'bg-rose-100 text-rose-800 border-rose-200' },
};

const ESTADOS_CONFIG = {
  PENDIENTE:  { Icon: Clock,        color: 'text-yellow-600' },
  PRESENTADA: { Icon: CheckCircle,  color: 'text-blue-600'   },
  PAGADA:     { Icon: CheckCircle,  color: 'text-green-600'  },
  VENCIDA:    { Icon: AlertCircle,  color: 'text-red-600'    },
};

function diasRestantes(fechaStr) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaStr); vence.setHours(0, 0, 0, 0);
  return Math.round((vence - hoy) / (1000 * 60 * 60 * 24));
}

function TarjetaMes({ mesData, mesActual, anioActual }) {
  const esPresente = mesData.mes === mesActual + 1 && mesData.anio === anioActual;
  const obligaciones = mesData.obligaciones || [];
  const vencidas  = obligaciones.filter((o) => o.estado === 'VENCIDA').length;
  const pagadas   = obligaciones.filter((o) => o.estado === 'PAGADA' || o.estado === 'PRESENTADA').length;
  const pendientes = obligaciones.filter((o) => o.estado === 'PENDIENTE').length;

  return (
    <div className={`bg-white rounded-xl border p-4 ${esPresente ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold text-sm ${esPresente ? 'text-blue-700' : 'text-slate-800'}`}>
          {MESES[mesData.mes - 1]}
          {esPresente && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Actual</span>
          )}
        </h3>
        <div className="flex gap-1">
          {vencidas   > 0 && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">{vencidas}v</span>}
          {pendientes > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">{pendientes}p</span>}
          {pagadas    > 0 && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{pagadas}✓</span>}
        </div>
      </div>

      <div className="space-y-1.5">
        {obligaciones.map((obl, i) => {
          const tipo   = TIPOS_CONFIG[obl.tipo] || { label: obl.tipo, color: 'bg-slate-100 text-slate-700 border-slate-200' };
          const estado = ESTADOS_CONFIG[obl.estado] || ESTADOS_CONFIG.PENDIENTE;
          const { Icon } = estado;
          const dias   = diasRestantes(obl.fechaVencimiento);
          const fecha  = new Date(obl.fechaVencimiento).toLocaleDateString('es-PA', { day: '2-digit', month: 'short' });
          const esVencida = obl.estado === 'VENCIDA';
          const esPagada  = obl.estado === 'PAGADA' || obl.estado === 'PRESENTADA';

          return (
            <div
              key={i}
              className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${
                esVencida ? 'bg-red-50 border-red-200' :
                esPagada  ? 'bg-green-50 border-green-200 opacity-75' :
                            'bg-slate-50 border-slate-200'
              }`}
            >
              <Icon size={12} className={`mt-0.5 shrink-0 ${estado.color}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 leading-tight truncate">{obl.descripcion}</p>
                <p className="text-slate-400 mt-0.5">{fecha}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className={`inline-block px-1 py-0.5 rounded border text-xs ${tipo.color}`}>{tipo.label}</span>
                {!esPagada && (
                  <p className={`text-xs font-medium mt-0.5 ${
                    dias < 0 ? 'text-red-600' : dias <= 7 ? 'text-red-500' : dias <= 15 ? 'text-orange-500' : 'text-slate-400'
                  }`}>
                    {dias < 0 ? 'Vencida' : dias === 0 ? '¡Hoy!' : `${dias}d`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {obligaciones.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-3">Sin obligaciones</p>
        )}
      </div>
    </div>
  );
}

export default function Calendario() {
  const { empresaId } = useParams();
  const queryClient = useQueryClient();
  const anioActual = new Date().getFullYear();
  const mesActual  = new Date().getMonth();
  const [anio, setAnio] = useState(anioActual);

  const { data: calendario, isLoading, error } = useQuery({
    queryKey: ['calendario', empresaId, anio],
    queryFn: () => calendarioApi.anual(empresaId, anio).then((r) => r.data),
    enabled: !!empresaId,
  });

  const { data: proximos } = useQuery({
    queryKey: ['proximos', empresaId],
    queryFn: () => calendarioApi.proximos(empresaId, 30).then((r) => r.data),
    enabled: !!empresaId,
  });

  const generarMut = useMutation({
    mutationFn: () => calendarioApi.generar(empresaId, anio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendario', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['proximos', empresaId] });
    },
  });

  const total     = calendario?.reduce((s, m) => s + (m.obligaciones?.length || 0), 0) || 0;
  const vencidas  = calendario?.reduce((s, m) => s + (m.obligaciones?.filter((o) => o.estado === 'VENCIDA').length || 0), 0) || 0;
  const pagadas   = calendario?.reduce((s, m) => s + (m.obligaciones?.filter((o) => o.estado === 'PAGADA' || o.estado === 'PRESENTADA').length || 0), 0) || 0;
  const pendientes = total - vencidas - pagadas;

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendario fiscal {anio}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Vencimientos ajustados por feriados nacionales de Panamá
          </p>
        </div>
        <button
          onClick={() => generarMut.mutate()}
          disabled={generarMut.isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          <RefreshCw size={14} className={generarMut.isPending ? 'animate-spin' : ''} />
          {generarMut.isPending ? 'Generando...' : 'Actualizar'}
        </button>
      </div>

      {/* Selector de año */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => setAnio((a) => a - 1)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
          <ChevronLeft size={16} />
        </button>
        <span className="text-base font-bold text-slate-900 w-12 text-center">{anio}</span>
        <button onClick={() => setAnio((a) => a + 1)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
          <ChevronRight size={16} />
        </button>
        {anio !== anioActual && (
          <button onClick={() => setAnio(anioActual)} className="text-xs text-blue-600 hover:underline ml-1">
            Hoy
          </button>
        )}
      </div>

      {/* Tarjetas de resumen */}
      {calendario && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total',      value: total,      bg: 'bg-slate-50',  text: 'text-slate-800' },
            { label: 'Pendientes', value: pendientes,  bg: 'bg-yellow-50', text: 'text-yellow-800' },
            { label: 'Vencidas',   value: vencidas,    bg: 'bg-red-50',    text: 'text-red-800' },
            { label: 'Cumplidas',  value: pagadas,     bg: 'bg-green-50',  text: 'text-green-800' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl border border-slate-200 p-3`}>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alerta de próximos 30 días */}
      {proximos && proximos.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-900 mb-2">Próximos 30 días ({proximos.length})</p>
          <div className="flex flex-wrap gap-2">
            {proximos.slice(0, 6).map((obl) => {
              const dias = Math.round((new Date(obl.proximoVencimiento) - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <div key={obl.id} className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${dias <= 7 ? 'bg-red-500' : dias <= 15 ? 'bg-orange-400' : 'bg-yellow-400'}`} />
                  <span className="text-xs font-medium text-slate-700">{obl.tipo}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(obl.proximoVencimiento).toLocaleDateString('es-PA', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className={`text-xs font-bold ${dias <= 7 ? 'text-red-600' : 'text-orange-600'}`}>
                    {dias === 0 ? '¡Hoy!' : `${dias}d`}
                  </span>
                </div>
              );
            })}
            {proximos.length > 6 && (
              <span className="text-xs text-amber-700 flex items-center">+{proximos.length - 6} más</span>
            )}
          </div>
        </div>
      )}

      {/* Estado de carga */}
      {isLoading && <div className="text-center py-16 text-slate-400 text-sm">Cargando calendario...</div>}

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
          <p className="text-amber-800 text-sm font-medium mb-3">El calendario aún no fue generado</p>
          <button
            onClick={() => generarMut.mutate()}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            Generar calendario {anio}
          </button>
        </div>
      )}

      {/* Grid 12 meses */}
      {calendario && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {calendario.map((mesData) => (
            <TarjetaMes
              key={`${mesData.anio}-${mesData.mes}`}
              mesData={mesData}
              mesActual={mesActual}
              anioActual={anioActual}
            />
          ))}
        </div>
      )}

      {generarMut.isSuccess && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ Calendario actualizado correctamente
        </div>
      )}
    </div>
  );
}
