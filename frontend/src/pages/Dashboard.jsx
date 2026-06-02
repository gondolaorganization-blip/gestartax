import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { dashboardApi } from '../api/dashboard.api';
import { formatUSD, formatFecha, MESES_NOMBRE } from '../utils/format';
import {
  AlertTriangle, CheckCircle, Clock, TrendingUp,
  ArrowRight, RefreshCw, Calendar, Receipt, FileText, CreditCard,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SALUD_CONFIG = {
  VERDE:    { label: 'Al día',        bg: 'bg-green-50  border-green-200',  dot: 'bg-green-500',  text: 'text-green-700'  },
  AMARILLO: { label: 'Atención',      bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500', text: 'text-yellow-700' },
  ROJO:     { label: 'Acción urgente',bg: 'bg-red-50    border-red-200',    dot: 'bg-red-500',    text: 'text-red-700'    },
};

const URGENCIA_COLOR = {
  CRITICA: 'text-red-600   bg-red-50   border-red-200',
  ALTA:    'text-orange-600 bg-orange-50 border-orange-200',
  MEDIA:   'text-yellow-600 bg-yellow-50 border-yellow-200',
  NORMAL:  'text-slate-600  bg-slate-50  border-slate-200',
};

const TIPO_LABEL = {
  ITBMS:             'ITBMS',
  ISR:               'ISR',
  ANTICIPO_ISR:      'Anticipo',
  CSS_SEA:           'CSS/SEA',
  AVISO_OPERACION:   'Aviso Op.',
  IMPUESTO_INMUEBLE: 'Inmueble',
  RETENCION:         'Retención',
};

// ─── Tarjeta de métrica ───────────────────────────────────────────────────────

function Metrica({ label, valor, sub, color = 'text-slate-900', bg = 'bg-white', icono, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`${bg} rounded-2xl border border-slate-200 p-5 text-left w-full ${onClick ? 'hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer' : ''}`}
    >
      {icono && <div className="mb-3">{icono}</div>}
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{valor}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </Wrapper>
  );
}

// ─── Tarjeta de obligación próxima ────────────────────────────────────────────

function FilaObligacion({ obl }) {
  const urgencia = URGENCIA_COLOR[obl.urgencia] || URGENCIA_COLOR.NORMAL;
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${urgencia}`}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{obl.descripcion || obl.tipo}</p>
        <p className="text-xs opacity-70 mt-0.5">{formatFecha(obl.proximoVencimiento)}</p>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-white/60">
          {TIPO_LABEL[obl.tipo] || obl.tipo}
        </span>
        <p className="text-xs font-bold mt-0.5">
          {obl.diasRestantes <= 0 ? 'Vencida' :
           obl.diasRestantes === 1 ? '¡Hoy!' :
           `${obl.diasRestantes}d`}
        </p>
      </div>
    </div>
  );
}

// ─── Tooltip personalizado del gráfico ───────────────────────────────────────

function TooltipGrafico({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 rounded-xl p-3 shadow-lg text-white text-xs space-y-1">
      <p className="font-bold text-slate-300 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold">{formatUSD(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Sección: ITBMS mes actual ────────────────────────────────────────────────

function PanelITBMSMes({ itbmsMes, mes, anio, empresaId, navigate }) {
  const tieneSaldo = itbmsMes && Number(itbmsMes.saldo) > 0;
  const tieneFavor = itbmsMes && Number(itbmsMes.saldoAFavor) > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Receipt size={16} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-800">
            ITBMS — {MESES_NOMBRE[mes - 1]} {anio}
          </h3>
        </div>
        <button
          onClick={() => navigate(`/empresa/${empresaId}/itbms`)}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          Ver módulo <ArrowRight size={11} />
        </button>
      </div>

      {!itbmsMes ? (
        <div className="text-center py-4">
          <p className="text-slate-400 text-sm">Sin declaración para {MESES_NOMBRE[mes - 1]}</p>
          <button
            onClick={() => navigate(`/empresa/${empresaId}/itbms`)}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Crear declaración
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500">Ventas totales</p>
              <p className="text-base font-bold text-slate-900">{formatUSD(itbmsMes.totalVentas)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500">ITBMS débito</p>
              <p className="text-base font-bold text-blue-700">{formatUSD(itbmsMes.itbmsDebito)}</p>
            </div>
          </div>
          <div className={`rounded-xl p-3 flex items-center justify-between ${
            tieneSaldo ? 'bg-red-50 border border-red-200' :
            tieneFavor ? 'bg-green-50 border border-green-200' :
            'bg-slate-50'
          }`}>
            <p className="text-xs font-medium text-slate-600">
              {tieneSaldo ? 'A pagar' : tieneFavor ? 'Saldo a favor' : 'Liquidado'}
            </p>
            <p className={`text-lg font-bold ${tieneSaldo ? 'text-red-700' : tieneFavor ? 'text-green-700' : 'text-slate-500'}`}>
              {tieneSaldo ? formatUSD(itbmsMes.saldo) : tieneFavor ? formatUSD(itbmsMes.saldoAFavor) : '$0.00'}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>Estado: <span className={`font-medium ${
              itbmsMes.estado === 'PAGADA' ? 'text-green-600' :
              itbmsMes.estado === 'PRESENTADA' ? 'text-blue-600' : 'text-slate-500'
            }`}>{itbmsMes.estado}</span></span>
            <span>Vence: {formatFecha(itbmsMes.fechaVencimiento)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sección: Anticipos ISR ───────────────────────────────────────────────────

function PanelAnticipos({ anticipoResumen, anticiposAnio, anio, empresaId, navigate }) {
  const pct = anticipoResumen.total > 0
    ? Math.round((anticipoResumen.pagado / anticipoResumen.total) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-800">Anticipos ISR {anio}</h3>
        </div>
        <button
          onClick={() => navigate(`/empresa/${empresaId}/anticipos`)}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          Ver módulo <ArrowRight size={11} />
        </button>
      </div>

      {anticiposAnio.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-slate-400 text-sm">No hay anticipos generados para {anio}</p>
          <button
            onClick={() => navigate(`/empresa/${empresaId}/anticipos`)}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Generar anticipos
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {anticiposAnio.map((a) => {
              const num = a.cuota === 'PRIMERA' ? 1 : a.cuota === 'SEGUNDA' ? 2 : 3;
              const esPagada = a.estado === 'PAGADA';
              return (
                <div key={a.id} className={`rounded-xl p-2.5 text-center border ${esPagada ? 'bg-green-50 border-green-200' : a.estado === 'VENCIDA' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-xs text-slate-500">{num}ra cuota</p>
                  <p className="text-sm font-bold text-slate-900">{formatUSD(a.monto)}</p>
                  {esPagada
                    ? <CheckCircle size={12} className="text-green-500 mx-auto mt-1" />
                    : <Clock size={12} className={`mx-auto mt-1 ${a.estado === 'VENCIDA' ? 'text-red-500' : 'text-slate-400'}`} />
                  }
                </div>
              );
            })}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{anticipoResumen.cuotasPagadas} de 3 cuotas pagadas</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-green-600 font-medium">Pagado: {formatUSD(anticipoResumen.pagado)}</span>
              {anticipoResumen.pendiente > 0 && (
                <span className="text-red-600 font-medium">Pendiente: {formatUSD(anticipoResumen.pendiente)}</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Página principal Dashboard ───────────────────────────────────────────────

export default function Dashboard() {
  const { empresaId } = useParams();
  const navigate = useNavigate();
  const anioActual = new Date().getFullYear();
  const mesActual  = new Date().getMonth() + 1;

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', empresaId],
    queryFn: () => dashboardApi.obtener(empresaId).then((r) => r.data),
    enabled: !!empresaId,
    staleTime: 3 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw size={28} className="text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Cargando posición fiscal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <p className="text-red-700 text-sm font-medium">Error al cargar el dashboard</p>
          <button onClick={() => refetch()} className="mt-3 text-sm text-red-600 hover:underline">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const {
    empresa, anio, mes, saludFiscal,
    itbmsMes, itbmsResumen,
    ventasMensuales,
    isrAnio, anticipoResumen, anticiposAnio,
    obligacionesMes, obligacionesVencidas,
    proximosVencimientos,
    alertasCriticas, totalNoLeidas,
    mesesDeclarados,
  } = data;

  const salud = SALUD_CONFIG[saludFiscal] || SALUD_CONFIG.VERDE;

  // Datos del gráfico: solo meses con datos o el mes actual
  const datosGrafico = ventasMensuales.filter((m) => m.ventas !== null || m.mes <= mes);

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard fiscal {anio}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {empresa?.nombre} · RUC {empresa?.ruc} · Régimen {empresa?.regimen}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Salud fiscal */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${salud.bg}`}>
            <div className={`w-2 h-2 rounded-full ${salud.dot}`} />
            <span className={`text-xs font-semibold ${salud.text}`}>{salud.label}</span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={15} className={`text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Alertas críticas (si existen) ──────────────────────────────────── */}
      {alertasCriticas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-600" />
            <p className="text-sm font-bold text-red-800">
              {alertasCriticas.length} alerta{alertasCriticas.length !== 1 ? 's' : ''} crítica{alertasCriticas.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => navigate(`/empresa/${empresaId}/alertas`)}
              className="ml-auto text-xs text-red-600 hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight size={11} />
            </button>
          </div>
          <div className="space-y-2">
            {alertasCriticas.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-sm text-red-700">
                <span className="text-red-400 mt-0.5">•</span>
                <span>{a.mensaje}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Métricas principales ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metrica
          label="Ventas acumuladas"
          valor={formatUSD(itbmsResumen.totalVentas)}
          sub={`${mesesDeclarados} meses declarados`}
          icono={<TrendingUp size={18} className="text-blue-500" />}
          onClick={() => navigate(`/empresa/${empresaId}/itbms`)}
        />
        <Metrica
          label="ITBMS del año"
          valor={formatUSD(itbmsResumen.impuestoPagado + itbmsResumen.impuestePendiente)}
          sub={itbmsResumen.impuestePendiente > 0 ? `${formatUSD(itbmsResumen.impuestePendiente)} pendiente` : 'Todo pagado'}
          color={itbmsResumen.impuestePendiente > 0 ? 'text-red-700' : 'text-green-700'}
          icono={<Receipt size={18} className="text-blue-500" />}
          onClick={() => navigate(`/empresa/${empresaId}/itbms`)}
        />
        <Metrica
          label="Anticipos ISR"
          valor={formatUSD(anticipoResumen.pagado)}
          sub={`de ${formatUSD(anticipoResumen.total)} total`}
          color="text-indigo-700"
          icono={<CreditCard size={18} className="text-indigo-500" />}
          onClick={() => navigate(`/empresa/${empresaId}/anticipos`)}
        />
        <Metrica
          label={isrAnio ? `ISR ${anio - 1}` : `ISR ${anio - 1}`}
          valor={isrAnio ? formatUSD(Math.abs(Number(isrAnio.saldo))) : '—'}
          sub={isrAnio
            ? (Number(isrAnio.saldo) > 0 ? 'Saldo a pagar' : 'Saldo a favor')
            : 'Sin declaración'}
          color={isrAnio ? (Number(isrAnio.saldo) > 0 ? 'text-red-700' : 'text-green-700') : 'text-slate-400'}
          icono={<FileText size={18} className="text-purple-500" />}
          onClick={() => navigate(`/empresa/${empresaId}/isr`)}
        />
      </div>

      {/* ── Gráfico de ventas mensuales ─────────────────────────────────────── */}
      {datosGrafico.some((m) => m.ventas !== null) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-800">Ventas e ITBMS mensual {anio}</h2>
            <span className="text-xs text-slate-400">{mesesDeclarados} meses con datos</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={datosGrafico} margin={{ top: 0, right: 10, left: 10, bottom: 0 }} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                width={45}
              />
              <Tooltip content={<TooltipGrafico />} />
              <Legend
                iconType="circle" iconSize={8}
                formatter={(v) => <span className="text-xs text-slate-600">{v}</span>}
              />
              <Bar dataKey="ventas" name="Ventas" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="itbms"  name="ITBMS"  fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Fila central: ITBMS mes + Anticipos ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelITBMSMes
          itbmsMes={itbmsMes}
          mes={mes}
          anio={anio}
          empresaId={empresaId}
          navigate={navigate}
        />
        <PanelAnticipos
          anticipoResumen={anticipoResumen}
          anticiposAnio={anticiposAnio}
          anio={anio}
          empresaId={empresaId}
          navigate={navigate}
        />
      </div>

      {/* ── Fila inferior: Próximos vencimientos + Vencidas ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Próximos 30 días */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-orange-500" />
              <h3 className="text-sm font-semibold text-slate-800">Próximos 30 días</h3>
            </div>
            <button
              onClick={() => navigate(`/empresa/${empresaId}/calendario`)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              Ver calendario <ArrowRight size={11} />
            </button>
          </div>

          {proximosVencimientos.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Sin vencimientos en los próximos 30 días</p>
            </div>
          ) : (
            <div className="space-y-2">
              {proximosVencimientos.map((obl) => (
                <FilaObligacion key={obl.id} obl={obl} />
              ))}
            </div>
          )}
        </div>

        {/* Obligaciones vencidas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className={obligacionesVencidas.length > 0 ? 'text-red-500' : 'text-slate-300'} />
              <h3 className="text-sm font-semibold text-slate-800">
                Obligaciones vencidas
                {obligacionesVencidas.length > 0 && (
                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                    {obligacionesVencidas.length}
                  </span>
                )}
              </h3>
            </div>
            {totalNoLeidas > 0 && (
              <button
                onClick={() => navigate(`/empresa/${empresaId}/alertas`)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                {totalNoLeidas} alerta{totalNoLeidas !== 1 ? 's' : ''} <ArrowRight size={11} />
              </button>
            )}
          </div>

          {obligacionesVencidas.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Sin obligaciones vencidas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {obligacionesVencidas.map((obl) => {
                const diasVencida = Math.round((new Date() - new Date(obl.proximoVencimiento)) / (1000 * 60 * 60 * 24));
                return (
                  <div key={obl.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-red-50 border-red-200">
                    <AlertTriangle size={13} className="text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-red-800 truncate">
                        {obl.descripcion || TIPO_LABEL[obl.tipo] || obl.tipo}
                      </p>
                      <p className="text-xs text-red-500 mt-0.5">{formatFecha(obl.proximoVencimiento)}</p>
                    </div>
                    <span className="text-xs font-bold text-red-700 shrink-0">
                      +{diasVencida}d
                    </span>
                  </div>
                );
              })}
              <p className="text-xs text-slate-400 text-center pt-1">
                Regularice cuanto antes para evitar recargos
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Accesos rápidos ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Nueva declaración ITBMS', path: 'itbms',    icon: Receipt,   color: 'text-blue-600   bg-blue-50   hover:bg-blue-100'   },
          { label: 'Declaración ISR',          path: 'isr',      icon: FileText,  color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
          { label: 'Anticipos ISR',            path: 'anticipos',icon: CreditCard,color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
          { label: 'Ver calendario fiscal',    path: 'calendario',icon: Calendar,  color: 'text-orange-600 bg-orange-50 hover:bg-orange-100' },
        ].map((acc) => {
          const Icon = acc.icon;
          return (
            <button
              key={acc.path}
              onClick={() => navigate(`/empresa/${empresaId}/${acc.path}`)}
              className={`flex items-center gap-3 p-4 rounded-xl border border-slate-200 transition-colors ${acc.color}`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="text-sm font-medium text-left leading-tight">{acc.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
