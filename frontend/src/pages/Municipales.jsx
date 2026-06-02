import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { municipalApi } from '../api/municipal.api';
import { formatUSD, formatFecha } from '../utils/format';
import { Plus, X, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

const ANIO_ACTUAL = new Date().getFullYear();
const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all';

const PERIODO_LABEL = { MENSUAL: 'Mensual', TRIMESTRAL: 'Trimestral', SEMESTRAL: 'Semestral', ANUAL: 'Anual' };
const ESTADO_CLS    = { PENDIENTE: 'bg-yellow-100 text-yellow-700', PAGADA: 'bg-green-100 text-green-700', VENCIDA: 'bg-red-100 text-red-700' };

const PLANTILLAS = [
  { nombre: 'Patente Municipal', descripcion: 'Licencia de operación municipal anual', periodicidad: 'ANUAL' },
  { nombre: 'Impuesto de Degüello', descripcion: 'Impuesto sobre sacrificio de animales', periodicidad: 'MENSUAL' },
  { nombre: 'Impuesto sobre Construcciones', descripcion: 'Gravamen sobre permisos de construcción', periodicidad: 'ANUAL' },
];

function ModalObligacion({ empresaId, obligacion, onCerrar }) {
  const qc = useQueryClient();
  const esEdicion = !!obligacion?.id;
  const [form, setForm] = useState({
    nombre:       obligacion?.nombre       ?? '',
    municipio:    obligacion?.municipio    ?? '',
    descripcion:  obligacion?.descripcion  ?? '',
    periodicidad: obligacion?.periodicidad ?? 'ANUAL',
    montoFijo:    obligacion?.montoFijo    ?? '',
  });
  const [error, setError] = useState('');
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: () => esEdicion
      ? municipalApi.actualizar(empresaId, obligacion.id, form)
      : municipalApi.crear(empresaId, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['municipales', empresaId] }); onCerrar(); },
    onError: (e) => setError(e.response?.data?.error || 'Error al guardar'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">{esEdicion ? 'Editar obligación' : 'Nueva obligación municipal'}</h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{error}</div>}

          {/* Plantillas rápidas */}
          {!esEdicion && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Plantillas comunes</p>
              <div className="flex flex-wrap gap-2">
                {PLANTILLAS.map((p) => (
                  <button key={p.nombre} onClick={() => setForm({ ...form, nombre: p.nombre, descripcion: p.descripcion, periodicidad: p.periodicidad })}
                    className="text-xs border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors">
                    {p.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nombre *</label>
            <input type="text" value={form.nombre} onChange={(e) => f('nombre', e.target.value)} placeholder="Ej: Patente Municipal" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Municipio</label>
              <input type="text" value={form.municipio} onChange={(e) => f('municipio', e.target.value)} placeholder="Ciudad de Panamá..." className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Periodicidad</label>
              <select value={form.periodicidad} onChange={(e) => f('periodicidad', e.target.value)} className={inputCls}>
                {Object.entries(PERIODO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descripción</label>
            <input type="text" value={form.descripcion} onChange={(e) => f('descripcion', e.target.value)} placeholder="Descripción breve..." className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Monto fijo (USD) — opcional</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input type="number" step="0.01" value={form.montoFijo} onChange={(e) => f('montoFijo', e.target.value)} placeholder="Si el monto es fijo..." className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={!form.nombre || mut.isPending}
            className="flex-1 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold disabled:opacity-60 transition-all">
            {mut.isPending ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear obligación'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalPago({ empresaId, obligacion, onCerrar }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    anio: ANIO_ACTUAL,
    monto: obligacion.montoFijo ?? '',
    fechaVence: '',
    referencia: '',
    observaciones: '',
  });
  const [error, setError] = useState('');

  const crearMut = useMutation({
    mutationFn: () => municipalApi.crearPago(empresaId, obligacion.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['municipales', empresaId] }); onCerrar(); },
    onError: (e) => setError(e.response?.data?.error || 'Error'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registrar pago</h2>
            <p className="text-xs text-slate-400 mt-0.5">{obligacion.nombre}{obligacion.municipio && ` — ${obligacion.municipio}`}</p>
          </div>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Monto (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fecha de vencimiento *</label>
            <input type="date" value={form.fechaVence} onChange={(e) => setForm({ ...form, fechaVence: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Referencia de pago</label>
            <input type="text" value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} placeholder="Nº comprobante..." className={inputCls} />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600">Cancelar</button>
          <button onClick={() => crearMut.mutate()} disabled={!form.monto || !form.fechaVence || crearMut.isPending}
            className="flex-1 py-2.5 text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold disabled:opacity-60 transition-all">
            {crearMut.isPending ? 'Guardando...' : 'Crear registro'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TarjetaObligacion({ obl, empresaId, onEditar, onNuevoPago }) {
  const [expandida, setExpandida] = useState(false);
  const qc = useQueryClient();
  const pagarMut = useMutation({
    mutationFn: (pId) => municipalApi.registrarPago(empresaId, obl.id, pId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['municipales', empresaId] }),
  });

  const pagosAnio = obl.pagos?.filter((p) => p.anio === ANIO_ACTUAL) || [];
  const pendientes = pagosAnio.filter((p) => p.estado !== 'PAGADA').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandida(!expandida)}>
        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
          <MapPin size={16} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900">{obl.nombre}</p>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{PERIODO_LABEL[obl.periodicidad]}</span>
            {!obl.activa && <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Inactiva</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
            {obl.municipio && <span>📍 {obl.municipio}</span>}
            {obl.montoFijo && <span>{formatUSD(obl.montoFijo)} fijo</span>}
            {pendientes > 0 && <span className="text-yellow-600 font-medium">{pendientes} pendiente(s)</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onEditar(obl); }} className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-2 py-1 rounded-lg">Editar</button>
          <button onClick={(e) => { e.stopPropagation(); onNuevoPago(obl); }} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg font-medium">+ Pago</button>
          {expandida ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>

      {expandida && obl.pagos?.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Historial de pagos</p>
          <div className="space-y-2">
            {obl.pagos.map((p) => (
              <div key={p.id} className="flex items-center gap-3 text-xs">
                <span className="text-slate-500 w-8">{p.anio}</span>
                <span className="font-semibold text-slate-800 w-20">{formatUSD(p.monto)}</span>
                <span className="text-slate-400 flex-1">Vence {formatFecha(p.fechaVence)}</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${ESTADO_CLS[p.estado] || ESTADO_CLS.PENDIENTE}`}>{p.estado === 'PAGADA' ? 'Pagado' : 'Pendiente'}</span>
                {p.estado !== 'PAGADA' && (
                  <button onClick={() => pagarMut.mutate(p.id)} disabled={pagarMut.isPending}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded-lg">Pagar</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {expandida && (!obl.pagos || obl.pagos.length === 0) && (
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 text-center">
          Sin pagos registrados — haz clic en "+ Pago" para agregar el primero
        </div>
      )}
    </div>
  );
}

export default function Municipales() {
  const { empresaId } = useParams();
  const [modalObl, setModalObl] = useState(null);
  const [modalPago, setModalPago] = useState(null);

  const { data: obligaciones = [], isLoading } = useQuery({
    queryKey: ['municipales', empresaId],
    queryFn: () => municipalApi.listar(empresaId).then((r) => r.data),
    enabled: !!empresaId,
  });

  const activas = obligaciones.filter((o) => o.activa);

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Impuestos Municipales</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de obligaciones fiscales municipales — Patente, degüello, construcciones y otros.</p>
        </div>
        <button onClick={() => setModalObl({})}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-200">
          <Plus size={15} /> Nueva obligación
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 text-xs text-blue-800">
        <strong>Nota:</strong> Los impuestos municipales varían según el municipio y corregimiento. Cada empresa puede tener obligaciones distintas. Agrega las que apliquen a tu operación y registra los pagos periódicamente.
      </div>

      {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Cargando...</div>}
      {!isLoading && obligaciones.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <MapPin size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Sin obligaciones municipales registradas</p>
          <p className="text-slate-400 text-sm mt-1">Agrega la Patente Municipal u otras obligaciones que apliquen a tu empresa.</p>
          <button onClick={() => setModalObl({})} className="mt-4 text-sm text-blue-600 hover:underline">Agregar primera obligación</button>
        </div>
      )}

      {activas.length > 0 && (
        <div className="space-y-3">
          {activas.map((obl) => (
            <TarjetaObligacion key={obl.id} obl={obl} empresaId={empresaId} onEditar={setModalObl} onNuevoPago={setModalPago} />
          ))}
        </div>
      )}

      {modalObl !== null && (
        <ModalObligacion
          empresaId={empresaId}
          obligacion={Object.keys(modalObl).length > 0 ? modalObl : null}
          onCerrar={() => setModalObl(null)}
        />
      )}
      {modalPago && <ModalPago empresaId={empresaId} obligacion={modalPago} onCerrar={() => setModalPago(null)} />}
    </div>
  );
}
