import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasaUnicaApi } from '../api/tasaUnica.api';
import { formatUSD, formatFecha } from '../utils/format';
import { Plus, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const ANIO_ACTUAL = new Date().getFullYear();
const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all';

const TIPO_LABEL = { SA: 'Sociedad Anónima (SA)', FIP: 'Fundación de Interés Privado', LIMITADA: 'Sociedad de Responsabilidad Limitada', OTRO: 'Otro tipo de sociedad' };
const ESTADO_CLS = { PENDIENTE: 'bg-yellow-100 text-yellow-700', PAGADA: 'bg-green-100 text-green-700', VENCIDA: 'bg-red-100 text-red-700' };

function ModalPago({ empresaId, tasa, onCerrar }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ fechaPago: new Date().toISOString().slice(0, 10), referencia: '', observaciones: '' });
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () => tasaUnicaApi.registrarPago(empresaId, tasa.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasa-unica', empresaId] }); onCerrar(); },
    onError: (e) => setError(e.response?.data?.error || 'Error al registrar'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registrar pago — Tasa Única {tasa.anio}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Registro Público de Panamá — {formatUSD(tasa.monto)}</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fecha de pago *</label>
              <input type="date" value={form.fechaPago} onChange={(e) => setForm({ ...form, fechaPago: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Referencia</label>
              <input type="text" value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} placeholder="Nº comprobante..." className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observaciones</label>
            <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={2} className={`${inputCls} resize-none`} />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={!form.fechaPago || mut.isPending}
            className="flex-1 py-2.5 text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold disabled:opacity-60 transition-all">
            {mut.isPending ? 'Guardando...' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalNueva({ empresaId, onCerrar }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ anio: ANIO_ACTUAL, tipoSociedad: 'SA', monto: '300', fechaVence: `${ANIO_ACTUAL}-06-30`, referencia: '', observaciones: '' });
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () => tasaUnicaApi.crear(empresaId, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasa-unica', empresaId] }); onCerrar(); },
    onError: (e) => setError(e.response?.data?.error || 'Error al crear'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Nueva Tasa Única</h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Año *</label>
              <input type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Monto (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de sociedad</label>
            <select value={form.tipoSociedad} onChange={(e) => setForm({ ...form, tipoSociedad: e.target.value })} className={inputCls}>
              {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fecha de vencimiento</label>
            <input type="date" value={form.fechaVence} onChange={(e) => setForm({ ...form, fechaVence: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={!form.anio || !form.fechaVence || mut.isPending}
            className="flex-1 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold disabled:opacity-60 transition-all">
            {mut.isPending ? 'Guardando...' : 'Crear registro'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TasaUnica() {
  const { empresaId } = useParams();
  const qc = useQueryClient();
  const [modalPago, setModalPago] = useState(null);
  const [modalNueva, setModalNueva] = useState(false);

  const { data: tasas = [], isLoading } = useQuery({
    queryKey: ['tasa-unica', empresaId],
    queryFn: () => tasaUnicaApi.listar(empresaId).then((r) => r.data),
    enabled: !!empresaId,
  });

  const generarMut = useMutation({
    mutationFn: () => tasaUnicaApi.generar(empresaId, { anio: ANIO_ACTUAL, tipoSociedad: 'SA' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasa-unica', empresaId] }),
  });

  const anioActual = tasas.find((t) => t.anio === ANIO_ACTUAL);
  const pagadas = tasas.filter((t) => t.estado === 'PAGADA').length;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasa Única</h1>
          <p className="text-slate-500 text-sm mt-1">Impuesto anual al Registro Público — Sociedades Anónimas y Fundaciones de Interés Privado.</p>
        </div>
        <div className="flex gap-2">
          {!anioActual && (
            <button onClick={() => generarMut.mutate()} disabled={generarMut.isPending}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-200 disabled:opacity-60">
              <Plus size={15} /> Generar {ANIO_ACTUAL}
            </button>
          )}
          <button onClick={() => setModalNueva(true)}
            className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-all">
            <Plus size={15} /> Otro año
          </button>
        </div>
      </div>

      {/* Estado actual */}
      {anioActual && (
        <div className={`rounded-2xl border p-5 mb-5 flex items-center gap-4 ${anioActual.estado === 'PAGADA' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-3xl">{anioActual.estado === 'PAGADA' ? '✅' : '❌'}</div>
          <div className="flex-1">
            <p className={`font-semibold ${anioActual.estado === 'PAGADA' ? 'text-green-800' : 'text-red-800'}`}>
              Tasa Única {ANIO_ACTUAL} — {anioActual.estado === 'PAGADA' ? 'Pagada' : 'Pendiente'}
            </p>
            <p className={`text-sm mt-0.5 ${anioActual.estado === 'PAGADA' ? 'text-green-600' : 'text-red-600'}`}>
              {anioActual.estado === 'PAGADA'
                ? `Pagada el ${formatFecha(anioActual.fechaPago)}`
                : `Vence: ${formatFecha(anioActual.fechaVence)} — ${formatUSD(anioActual.monto)}`}
            </p>
          </div>
          {anioActual.estado !== 'PAGADA' && (
            <button onClick={() => setModalPago(anioActual)}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              Registrar pago
            </button>
          )}
        </div>
      )}

      {/* Info normativa */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden mb-5 text-xs">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <p className="font-bold text-slate-700 uppercase tracking-wider">Referencia — Tasa Única (Ley 32 de 1927 y modificaciones)</p>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4 text-slate-600">
          <ul className="space-y-1.5">
            <li className="flex justify-between"><span>Sociedad Anónima (SA)</span><span className="font-bold text-blue-700">$300.00/año</span></li>
            <li className="flex justify-between"><span>Fundación de Interés Privado</span><span className="font-bold text-blue-700">$300.00/año</span></li>
          </ul>
          <ul className="space-y-1.5">
            <li>Pagado al <strong>Registro Público de Panamá</strong></li>
            <li>Vencimiento: <strong>30 de junio</strong> de cada año</li>
            <li>Incumplimiento: multa + suspensión de la sociedad</li>
          </ul>
        </div>
      </div>

      {/* Historial */}
      {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Cargando...</div>}
      {!isLoading && tasas.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-medium">Sin registros de Tasa Única</p>
          <p className="text-slate-400 text-sm mt-1">Genera el registro del año actual para comenzar el seguimiento.</p>
        </div>
      )}
      {tasas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Historial</h2>
            <span className="text-xs text-slate-400">{pagadas} de {tasas.length} pagadas</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Año</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-right">Monto</th>
                <th className="px-4 py-2 text-left">Vencimiento</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tasas.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{t.anio}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{TIPO_LABEL[t.tipoSociedad] || t.tipoSociedad}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatUSD(t.monto)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatFecha(t.fechaVence)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ESTADO_CLS[t.estado] || ESTADO_CLS.PENDIENTE}`}>
                      {t.estado === 'PAGADA' ? 'Pagada' : t.estado === 'VENCIDA' ? 'Vencida' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.estado !== 'PAGADA' && (
                      <button onClick={() => setModalPago(t)} className="text-xs text-blue-600 hover:underline">Registrar pago</button>
                    )}
                    {t.estado === 'PAGADA' && t.fechaPago && (
                      <span className="text-xs text-slate-400">Pagado {formatFecha(t.fechaPago)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalPago && <ModalPago empresaId={empresaId} tasa={modalPago} onCerrar={() => setModalPago(null)} />}
      {modalNueva && <ModalNueva empresaId={empresaId} onCerrar={() => setModalNueva(false)} />}
    </div>
  );
}
