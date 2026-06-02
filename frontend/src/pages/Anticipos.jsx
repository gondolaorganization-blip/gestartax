import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { anticipoApi } from '../api/isr.api';
import { formatUSD, formatFecha } from '../utils/format';
import { CheckCircle, Clock, AlertCircle, Plus, X, DollarSign } from 'lucide-react';

const CUOTA_INFO = {
  PRIMERA: { label: '1ra cuota', mes: 'Marzo',      num: 1 },
  SEGUNDA: { label: '2da cuota', mes: 'Junio',       num: 2 },
  TERCERA: { label: '3ra cuota', mes: 'Septiembre',  num: 3 },
};

const ESTADO_ICON = {
  PENDIENTE: { Icon: Clock,         cls: 'text-yellow-500', bg: 'bg-yellow-50  border-yellow-200' },
  PAGADA:    { Icon: CheckCircle,   cls: 'text-green-500',  bg: 'bg-green-50   border-green-200'  },
  VENCIDA:   { Icon: AlertCircle,   cls: 'text-red-500',    bg: 'bg-red-50     border-red-200'    },
};

// ─── Modal de pago ─────────────────────────────────────────────────────────────

function ModalPago({ anticipo, empresaId, onCerrar }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    monto:           Number(anticipo.monto).toFixed(2),
    fecha:           new Date().toISOString().split('T')[0],
    referenciaBanco: '',
    banco:           '',
    observaciones:   '',
  });
  const [error, setError] = useState('');

  const pagoMut = useMutation({
    mutationFn: () => anticipoApi.registrarPago(empresaId, anticipo.id, {
      ...form,
      monto: parseFloat(form.monto),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anticipos', empresaId] });
      onCerrar();
    },
    onError: (e) => setError(e.response?.data?.error || 'Error al registrar pago'),
  });

  const info = CUOTA_INFO[anticipo.cuota];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registrar pago</h2>
            <p className="text-xs text-slate-500">Anticipo ISR — {info.label} {anticipo.anio}</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto pagado</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number" min="0" step="0.01"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de pago</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Banco</label>
              <input
                type="text"
                value={form.banco}
                onChange={(e) => setForm({ ...form, banco: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Banconal, BAC..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Referencia</label>
              <input
                type="text"
                value={form.referenciaBanco}
                onChange={(e) => setForm({ ...form, referenciaBanco: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nro. transacción"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
            <input
              type="text"
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="flex-1 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={() => pagoMut.mutate()}
            disabled={pagoMut.isPending}
            className="flex-1 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-60"
          >
            {pagoMut.isPending ? 'Registrando...' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal generar anticipos ──────────────────────────────────────────────────

function ModalGenerar({ empresaId, anio, onCerrar }) {
  const qc = useQueryClient();
  const [montoBase, setMontoBase] = useState('');
  const [error, setError] = useState('');

  const generarMut = useMutation({
    mutationFn: () => anticipoApi.generar(empresaId, { anio, montoBase: parseFloat(montoBase) || undefined }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['anticipos', empresaId] });
      onCerrar(res.data);
    },
    onError: (e) => setError(e.response?.data?.error || 'Error al generar anticipos'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Generar anticipos {anio}</h2>
          <button onClick={() => onCerrar(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs">
            Si existe la declaración ISR {anio - 1}, el monto se calcula automáticamente.
            De lo contrario, ingrese el ISR base manualmente.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ISR base (opcional si ya existe declaración {anio - 1})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number" min="0" step="0.01"
                value={montoBase}
                onChange={(e) => setMontoBase(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ISR del año anterior"
              />
            </div>
            {montoBase && (
              <p className="text-xs text-slate-500 mt-1">
                Cada cuota será: {formatUSD(Math.round(parseFloat(montoBase) / 3 * 100) / 100)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={() => onCerrar(null)} className="flex-1 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={() => generarMut.mutate()}
            disabled={generarMut.isPending}
            className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60"
          >
            {generarMut.isPending ? 'Generando...' : 'Generar 3 anticipos'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de anticipo ──────────────────────────────────────────────────────

function TarjetaAnticipo({ anticipo, onPagar }) {
  const info   = CUOTA_INFO[anticipo.cuota] || { label: anticipo.cuota, mes: '' };
  const estado = ESTADO_ICON[anticipo.estado] || ESTADO_ICON.PENDIENTE;
  const { Icon } = estado;
  const dias   = anticipo.diasRestantes;
  const esPagada = anticipo.estado === 'PAGADA';

  return (
    <div className={`rounded-xl border-2 p-4 ${esPagada ? 'border-green-200 bg-green-50/40' : anticipo.estado === 'VENCIDA' ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${esPagada ? 'bg-green-500' : anticipo.estado === 'VENCIDA' ? 'bg-red-500' : 'bg-slate-400'}`}>
            {info.num}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{info.label}</p>
            <p className="text-xs text-slate-500">{info.mes}</p>
          </div>
        </div>
        <Icon size={16} className={estado.cls} />
      </div>

      <p className="text-2xl font-bold text-slate-900 mb-1">{formatUSD(anticipo.monto)}</p>
      <p className="text-xs text-slate-500">Vence: {formatFecha(anticipo.fechaVence)}</p>

      {!esPagada && dias !== undefined && (
        <p className={`text-xs font-medium mt-1 ${dias < 0 ? 'text-red-600' : dias <= 7 ? 'text-red-500' : dias <= 30 ? 'text-orange-500' : 'text-slate-400'}`}>
          {dias < 0 ? `Vencida hace ${Math.abs(dias)} días` : dias === 0 ? '¡Vence hoy!' : `${dias} días para vencer`}
        </p>
      )}

      {esPagada && anticipo.fechaPago && (
        <p className="text-xs text-green-600 mt-1">Pagado: {formatFecha(anticipo.fechaPago)}</p>
      )}

      {!esPagada && (
        <button
          onClick={() => onPagar(anticipo)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium py-2 rounded-lg transition-colors"
        >
          <DollarSign size={12} />
          Registrar pago
        </button>
      )}
    </div>
  );
}

// ─── Página principal Anticipos ───────────────────────────────────────────────

export default function Anticipos() {
  const { empresaId } = useParams();
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(anioActual);
  const [modalPago, setModalPago]       = useState(null);
  const [modalGenerar, setModalGenerar] = useState(false);
  const [mensajeOk, setMensajeOk]       = useState('');

  const { data: resumen, isLoading } = useQuery({
    queryKey: ['anticipos', empresaId, anio],
    queryFn: () => anticipoApi.resumen(empresaId, anio).then((r) => r.data),
    enabled: !!empresaId,
  });

  const anticipos = resumen?.anticipos || [];
  const totales   = resumen?.resumen   || {};

  function cerrarGenerar(resultado) {
    setModalGenerar(false);
    if (resultado) {
      setMensajeOk(`${resultado.mensaje} — Monto por cuota: ${formatUSD(resultado.montoPorCuota)}`);
      setTimeout(() => setMensajeOk(''), 4000);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Anticipos ISR</h1>
          <p className="text-slate-500 text-sm mt-0.5">3 cuotas anuales — Marzo, Junio y Septiembre</p>
        </div>
        <button
          onClick={() => setModalGenerar(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Generar anticipos
        </button>
      </div>

      {/* Selector de año */}
      <div className="flex items-center gap-2 mb-5">
        {[anioActual - 1, anioActual, anioActual + 1].map((a) => (
          <button
            key={a}
            onClick={() => setAnio(a)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${anio === a ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {a}
          </button>
        ))}
      </div>

      {mensajeOk && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ {mensajeOk}
        </div>
      )}

      {/* Resumen */}
      {resumen && anticipos.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total anticipos',    value: formatUSD(totales.totalMonto),     color: 'text-slate-900' },
            { label: 'Pagado',             value: formatUSD(totales.totalPagado),    color: 'text-green-700' },
            { label: 'Pendiente',          value: formatUSD(totales.totalPendiente), color: totales.totalPendiente > 0 ? 'text-red-700' : 'text-slate-400' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {anticipos.length > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{totales.cuotasPagadas} de {totales.cuotasTotales} cuotas pagadas</span>
            <span>{Math.round((totales.cuotasPagadas / totales.cuotasTotales) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${(totales.cuotasPagadas / totales.cuotasTotales) * 100}%` }}
            />
          </div>
        </div>
      )}

      {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Cargando...</div>}

      {!isLoading && anticipos.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400 text-sm">No hay anticipos generados para {anio}</p>
          <button
            onClick={() => setModalGenerar(true)}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            Generar anticipos {anio}
          </button>
        </div>
      )}

      {anticipos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {anticipos.map((a) => (
            <TarjetaAnticipo key={a.id} anticipo={a} onPagar={setModalPago} />
          ))}
        </div>
      )}

      {/* ISR vinculado */}
      {resumen?.isrVinculado && (
        <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Declaración ISR {anio} vinculada</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700">ISR causado: <strong>{formatUSD(resumen.isrVinculado.impuestoCausado)}</strong></span>
            <span className="text-slate-700">Anticipos aplicados: <strong>{formatUSD(resumen.isrVinculado.anticiposPagados)}</strong></span>
            <span className={`font-bold ${Number(resumen.isrVinculado.saldo) > 0 ? 'text-red-700' : 'text-green-700'}`}>
              Saldo: {formatUSD(Math.abs(Number(resumen.isrVinculado.saldo)))}
            </span>
          </div>
        </div>
      )}

      {modalPago && (
        <ModalPago anticipo={modalPago} empresaId={empresaId} onCerrar={() => setModalPago(null)} />
      )}
      {modalGenerar && (
        <ModalGenerar empresaId={empresaId} anio={anio} onCerrar={cerrarGenerar} />
      )}
    </div>
  );
}
