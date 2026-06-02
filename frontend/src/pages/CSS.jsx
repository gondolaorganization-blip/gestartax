import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planillaApi } from '../api/planilla.api';
import { obligacionApi } from '../api/obligacion.api';
import { pagoApi } from '../api/pago.api';
import { formatUSD, formatFecha } from '../utils/format';
import { Users, Calculator, ClipboardList, Plus, X, ChevronDown, ChevronUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = [ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all';

// ─── Tab Empleados ─────────────────────────────────────────────────────────────

function ModalEmpleado({ empresaId, empleado, onCerrar }) {
  const qc = useQueryClient();
  const esEdicion = !!empleado;
  const [form, setForm] = useState({
    cedula:         empleado?.cedula         ?? '',
    nombre:         empleado?.nombre         ?? '',
    apellido:       empleado?.apellido       ?? '',
    cargo:          empleado?.cargo          ?? '',
    departamento:   empleado?.departamento   ?? '',
    fechaIngreso:   empleado?.fechaIngreso   ? empleado.fechaIngreso.slice(0, 10) : '',
    tipoContrato:   empleado?.tipoContrato   ?? 'INDEFINIDO',
    salarioMensual: empleado?.salarioMensual ?? '',
    periodoPago:    empleado?.periodoPago    ?? 'MENSUAL',
  });
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: (datos) => esEdicion
      ? planillaApi.actualizarEmpleado(empresaId, empleado.id, datos)
      : planillaApi.crearEmpleado(empresaId, datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empleados', empresaId] }); onCerrar(); },
    onError: (e) => setError(e.response?.data?.error || 'Error al guardar'),
  });

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">{esEdicion ? 'Editar empleado' : 'Agregar empleado'}</h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cédula *</label>
              <input value={form.cedula} onChange={(e) => f('cedula', e.target.value)} className={inputCls} placeholder="8-123-456" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cargo *</label>
              <input value={form.cargo} onChange={(e) => f('cargo', e.target.value)} className={inputCls} placeholder="Contador, Asistente..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nombre *</label>
              <input value={form.nombre} onChange={(e) => f('nombre', e.target.value)} className={inputCls} placeholder="Juan" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Apellido *</label>
              <input value={form.apellido} onChange={(e) => f('apellido', e.target.value)} className={inputCls} placeholder="Pérez" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Departamento</label>
              <input value={form.departamento} onChange={(e) => f('departamento', e.target.value)} className={inputCls} placeholder="Administración..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fecha de ingreso *</label>
              <input type="date" value={form.fechaIngreso} onChange={(e) => f('fechaIngreso', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo contrato</label>
              <select value={form.tipoContrato} onChange={(e) => f('tipoContrato', e.target.value)} className={inputCls}>
                <option value="INDEFINIDO">Indefinido</option>
                <option value="DEFINIDO">Definido</option>
                <option value="TEMPORAL">Temporal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Período de pago</label>
              <select value={form.periodoPago} onChange={(e) => f('periodoPago', e.target.value)} className={inputCls}>
                <option value="MENSUAL">Mensual</option>
                <option value="QUINCENAL">Quincenal</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Salario mensual (USD) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input type="number" min="0" step="0.01" value={form.salarioMensual} onChange={(e) => f('salarioMensual', e.target.value)} className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" placeholder="1000.00" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100">Cancelar</button>
          <button
            onClick={() => mut.mutate(form)}
            disabled={!form.cedula || !form.nombre || !form.apellido || !form.cargo || !form.fechaIngreso || !form.salarioMensual || mut.isPending}
            className="flex-1 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold disabled:opacity-60 transition-all"
          >
            {mut.isPending ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Agregar empleado'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabEmpleados({ empresaId }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'nuevo' | empleado

  const { data: empleados = [], isLoading } = useQuery({
    queryKey: ['empleados', empresaId],
    queryFn: () => planillaApi.listarEmpleados(empresaId).then((r) => r.data),
    enabled: !!empresaId,
  });

  const desactivarMut = useMutation({
    mutationFn: (emp) => planillaApi.actualizarEmpleado(empresaId, emp.id, { activo: !emp.activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empleados', empresaId] }),
  });

  const activos   = empleados.filter((e) => e.activo);
  const inactivos = empleados.filter((e) => !e.activo);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm text-slate-500">{activos.length} empleado{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('nuevo')} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-200">
          <Plus size={15} /> Agregar empleado
        </button>
      </div>

      {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Cargando...</div>}

      {!isLoading && empleados.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Users size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Sin empleados registrados</p>
          <p className="text-slate-400 text-sm mt-1">Agregue empleados para calcular la planilla CSS/SEA</p>
          <button onClick={() => setModal('nuevo')} className="mt-4 text-sm text-blue-600 hover:underline">Agregar primer empleado</button>
        </div>
      )}

      {activos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-left">Cargo</th>
                <th className="px-4 py-3 text-left">Contrato</th>
                <th className="px-4 py-3 text-right">Salario mensual</th>
                <th className="px-4 py-3 text-right">CSS/SEA patrono/mes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {activos.map((emp) => {
                const cssPat = Math.round(Number(emp.salarioMensual) * 0.1225 * 100) / 100;
                const seaPat = Math.round(Number(emp.salarioMensual) * 0.015  * 100) / 100;
                return (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{emp.nombre} {emp.apellido}</p>
                      <p className="text-xs text-slate-400">{emp.cedula}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{emp.cargo}</p>
                      {emp.departamento && <p className="text-xs text-slate-400">{emp.departamento}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{emp.tipoContrato}</span>
                      <p className="text-xs text-slate-400 mt-0.5">{emp.periodoPago}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatUSD(emp.salarioMensual)}</td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold text-blue-700">{formatUSD(cssPat + seaPat)}</p>
                      <p className="text-xs text-slate-400">CSS {formatUSD(cssPat)} + SEA {formatUSD(seaPat)}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setModal(emp)} className="text-xs text-blue-600 hover:underline">Editar</button>
                        <button onClick={() => desactivarMut.mutate(emp)} className="text-xs text-red-500 hover:underline">Desactivar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={3} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Total {activos.length} empleados</td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">{formatUSD(activos.reduce((s, e) => s + Number(e.salarioMensual), 0))}</td>
                <td className="px-4 py-3 text-right font-bold text-blue-700">
                  {formatUSD(activos.reduce((s, e) => s + Math.round(Number(e.salarioMensual) * 0.1375 * 100) / 100, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {inactivos.length > 0 && (
        <p className="text-xs text-slate-400 text-center">{inactivos.length} empleado{inactivos.length !== 1 ? 's' : ''} inactivo{inactivos.length !== 1 ? 's' : ''}</p>
      )}

      {modal && (
        <ModalEmpleado
          empresaId={empresaId}
          empleado={modal === 'nuevo' ? null : modal}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── Tab Planilla ──────────────────────────────────────────────────────────────

function ModalNuevaPlanilla({ empresaId, anio, onCerrar }) {
  const qc = useQueryClient();
  const mesActual = new Date().getMonth() + 1;
  const [form, setForm] = useState({
    tipo: 'REGULAR',
    mes: mesActual,
    anio,
    fechaInicio: `${anio}-${String(mesActual).padStart(2, '0')}-01`,
    fechaFin: '',
    notas: '',
  });
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () => planillaApi.crearPeriodo(empresaId, { ...form, mes: parseInt(form.mes), anio: parseInt(form.anio) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planilla', empresaId] }); onCerrar(); },
    onError: (e) => setError(e.response?.data?.error || 'Error al generar planilla'),
  });

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Generar planilla</h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo</label>
              <select value={form.tipo} onChange={(e) => f('tipo', e.target.value)} className={inputCls}>
                <option value="REGULAR">Regular</option>
                <option value="DECIMO">Décimo tercer mes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mes</label>
              <select value={form.mes} onChange={(e) => f('mes', e.target.value)} className={inputCls}>
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>

          {form.tipo === 'DECIMO' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <strong>Décimo tercer mes:</strong> aplica CSS y SEA sobre 1/3 del salario mensual. No aplica ISR (exento por ley).
              Meses válidos: Abril, Agosto, Diciembre.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fecha inicio</label>
              <input type="date" value={form.fechaInicio} onChange={(e) => f('fechaInicio', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fecha fin</label>
              <input type="date" value={form.fechaFin} onChange={(e) => f('fechaFin', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notas</label>
            <textarea value={form.notas} onChange={(e) => f('notas', e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Observaciones..." />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={!form.fechaInicio || !form.fechaFin || mut.isPending}
            className="flex-1 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold disabled:opacity-60 transition-all">
            {mut.isPending ? 'Calculando...' : 'Calcular planilla'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilaPeriodo({ periodo, empresaId }) {
  const qc = useQueryClient();
  const [expandido, setExpandido] = useState(false);

  const { data: detalle } = useQuery({
    queryKey: ['planilla-detalle', periodo.id],
    queryFn: () => planillaApi.obtenerPeriodo(empresaId, periodo.id).then((r) => r.data),
    enabled: expandido,
  });

  const estadoMut = useMutation({
    mutationFn: (estado) => planillaApi.cambiarEstado(empresaId, periodo.id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planilla', empresaId] }),
  });

  const ESTADO_CLS = {
    BORRADOR: 'bg-slate-100 text-slate-600',
    APROBADA: 'bg-blue-100 text-blue-700',
    PAGADA:   'bg-green-100 text-green-700',
  };

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setExpandido(!expandido)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${periodo.tipo === 'DECIMO' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
              {periodo.tipo === 'DECIMO' ? 'Décimo' : 'Regular'}
            </span>
            <span className="text-sm font-medium text-slate-800">{MESES[periodo.mes - 1]} {periodo.anio}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{periodo._count?.lineas || 0} empleados</p>
        </td>
        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{formatUSD(periodo.totalBruto)}</td>
        <td className="px-4 py-3 text-right">
          <p className="text-sm font-semibold text-blue-700">{formatUSD(periodo.totalPatrono)}</p>
          <p className="text-xs text-slate-400">CSS {formatUSD(periodo.totalCSSPat)} + SEA {formatUSD(periodo.totalSEAPat)}</p>
        </td>
        <td className="px-4 py-3 text-right">
          <p className="text-sm text-slate-600">{formatUSD(Number(periodo.totalCSSEmp) + Number(periodo.totalSEAEmp))}</p>
          <p className="text-xs text-slate-400">retención empleado</p>
        </td>
        <td className="px-4 py-3 text-right font-bold text-blue-800">
          {formatUSD(Number(periodo.totalPatrono) + Number(periodo.totalCSSEmp) + Number(periodo.totalSEAEmp))}
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_CLS[periodo.estado]}`}>{periodo.estado}</span>
        </td>
        <td className="px-4 py-3 text-right">
          {expandido ? <ChevronUp size={14} className="text-slate-400 ml-auto" /> : <ChevronDown size={14} className="text-slate-400 ml-auto" />}
        </td>
      </tr>

      {expandido && (
        <tr className="bg-slate-50 border-b border-slate-200">
          <td colSpan={7} className="px-4 py-4">
            {!detalle ? (
              <p className="text-xs text-slate-400 text-center py-2">Cargando detalle...</p>
            ) : (
              <>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 font-semibold uppercase tracking-wide border-b border-slate-200">
                        <th className="pb-2 text-left">Empleado</th>
                        <th className="pb-2 text-right">Salario bruto</th>
                        <th className="pb-2 text-right">CSS emp</th>
                        <th className="pb-2 text-right">SEA emp</th>
                        <th className="pb-2 text-right">ISR</th>
                        <th className="pb-2 text-right">Neto empleado</th>
                        <th className="pb-2 text-right">CSS patrono</th>
                        <th className="pb-2 text-right">SEA patrono</th>
                        <th className="pb-2 text-right font-bold text-blue-700">Total CSS/SEA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.lineas.map((l) => (
                        <tr key={l.id} className="border-b border-slate-100">
                          <td className="py-2 pr-3">
                            <p className="font-medium text-slate-800">{l.empleado.nombre} {l.empleado.apellido}</p>
                            <p className="text-slate-400">{l.empleado.cargo}</p>
                          </td>
                          <td className="py-2 text-right text-slate-700">{formatUSD(l.salarioBruto)}</td>
                          <td className="py-2 text-right text-slate-600">{formatUSD(l.cssEmpleado)}</td>
                          <td className="py-2 text-right text-slate-600">{formatUSD(l.seaEmpleado)}</td>
                          <td className="py-2 text-right text-slate-600">{formatUSD(l.isr)}</td>
                          <td className="py-2 text-right font-medium text-green-700">{formatUSD(l.salarioNeto)}</td>
                          <td className="py-2 text-right text-slate-600">{formatUSD(l.cssPatrono)}</td>
                          <td className="py-2 text-right text-slate-600">{formatUSD(l.seaPatrono)}</td>
                          <td className="py-2 text-right font-bold text-blue-700">
                            {formatUSD(Number(l.cssEmpleado) + Number(l.seaEmpleado) + Number(l.cssPatrono) + Number(l.seaPatrono))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-xs text-slate-500">
                    {formatFecha(detalle.fechaInicio)} → {formatFecha(detalle.fechaFin)}
                    {detalle.notas && <span className="italic">{detalle.notas}</span>}
                  </div>
                  <div className="flex gap-2">
                    {detalle.estado === 'BORRADOR' && (
                      <button onClick={() => estadoMut.mutate('APROBADA')} disabled={estadoMut.isPending}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Aprobar planilla
                      </button>
                    )}
                    {detalle.estado === 'APROBADA' && (
                      <button onClick={() => estadoMut.mutate('PAGADA')} disabled={estadoMut.isPending}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Marcar como pagada
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function TabPlanilla({ empresaId }) {
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [modalNueva, setModalNueva] = useState(false);

  const { data: periodos = [], isLoading } = useQuery({
    queryKey: ['planilla', empresaId, anio],
    queryFn: () => planillaApi.listarPeriodos(empresaId, anio).then((r) => r.data),
    enabled: !!empresaId,
  });

  const totalPatrono = periodos.reduce((s, p) => s + Number(p.totalPatrono), 0);
  const totalEmpSea  = periodos.reduce((s, p) => s + Number(p.totalCSSEmp) + Number(p.totalSEAEmp), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2">
          {ANIOS.map((a) => (
            <button key={a} onClick={() => setAnio(a)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${anio === a ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {a}
            </button>
          ))}
        </div>
        <button onClick={() => setModalNueva(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-200">
          <Calculator size={15} /> Generar planilla
        </button>
      </div>

      {periodos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Total aporte patrono {anio}</p>
            <p className="text-xl font-bold text-blue-700">{formatUSD(totalPatrono)}</p>
            <p className="text-xs text-slate-400 mt-0.5">CSS 12.25% + SEA 1.5%</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Total retención empleados {anio}</p>
            <p className="text-xl font-bold text-slate-700">{formatUSD(totalEmpSea)}</p>
            <p className="text-xs text-slate-400 mt-0.5">CSS 9.75% + SEA 1.25%</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Cargando...</div>}
        {!isLoading && periodos.length === 0 && (
          <div className="text-center py-16">
            <Calculator size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Sin planillas para {anio}</p>
            <p className="text-slate-400 text-sm mt-1">Genere la primera planilla para calcular CSS/SEA automáticamente</p>
            <button onClick={() => setModalNueva(true)} className="mt-4 text-sm text-blue-600 hover:underline">Generar planilla</button>
          </div>
        )}
        {periodos.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Período</th>
                <th className="px-4 py-3 text-right">Bruto total</th>
                <th className="px-4 py-3 text-right">CSS/SEA patrono</th>
                <th className="px-4 py-3 text-right">CSS/SEA empleado</th>
                <th className="px-4 py-3 text-right font-bold text-blue-700">Total a la CSS</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {periodos.map((p) => <FilaPeriodo key={p.id} periodo={p} empresaId={empresaId} />)}
            </tbody>
          </table>
        )}
      </div>

      {modalNueva && <ModalNuevaPlanilla empresaId={empresaId} anio={anio} onCerrar={() => setModalNueva(false)} />}
    </div>
  );
}

// ─── Tab Obligaciones ──────────────────────────────────────────────────────────

function ModalPagoObl({ empresaId, obligacion, onCerrar }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ monto: obligacion.montoEstimado ? String(obligacion.montoEstimado) : '', fecha: new Date().toISOString().slice(0, 10), referenciaBanco: '', banco: '', observaciones: '' });
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () => pagoApi.registrar(empresaId, { obligacionId: obligacion.id, ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['css-obligaciones', empresaId] }); onCerrar(); },
    onError: (e) => setError(e.response?.data?.error || 'Error al registrar el pago'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Registrar pago CSS/SEA</h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600">{obligacion.descripcion} — {formatFecha(obligacion.proximoVencimiento)}</p>
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Monto (USD) *</label>
              <input type="number" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fecha de pago *</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Banco</label>
              <input type="text" value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} placeholder="Banco Nacional..." className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Referencia</label>
              <input type="text" value={form.referenciaBanco} onChange={(e) => setForm({ ...form, referenciaBanco: e.target.value })} placeholder="Nº comprobante..." className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observaciones</label>
            <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={2} className={`${inputCls} resize-none`} />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={!form.monto || !form.fecha || mut.isPending}
            className="flex-1 py-2.5 text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold disabled:opacity-60 transition-all">
            {mut.isPending ? 'Guardando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabObligaciones({ empresaId }) {
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [modalPago, setModalPago] = useState(null);

  const { data: obligaciones = [], isLoading } = useQuery({
    queryKey: ['css-obligaciones', empresaId, anio],
    queryFn: () => obligacionApi.listar(empresaId, { tipo: 'CSS_SEA', anio }).then((r) => r.data),
    enabled: !!empresaId,
  });

  const pagadas  = obligaciones.filter((o) => o.estado === 'PAGADA').length;
  const vencidas = obligaciones.filter((o) => o.estado === 'VENCIDA').length;

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {ANIOS.map((a) => (
          <button key={a} onClick={() => setAnio(a)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${anio === a ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {a}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Obligaciones</p>
          <p className="text-xl font-bold text-slate-900">{obligaciones.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Pagadas</p>
          <p className="text-xl font-bold text-green-700">{pagadas}</p>
        </div>
        <div className={`rounded-xl border p-4 ${vencidas > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <p className="text-xs text-slate-500 mb-1">Vencidas</p>
          <p className={`text-xl font-bold ${vencidas > 0 ? 'text-red-700' : 'text-slate-900'}`}>{vencidas}</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm">
        <p className="font-semibold text-blue-800 mb-1">Referencia CSS/SEA — Panamá</p>
        <ul className="text-blue-700 text-xs space-y-0.5 list-disc list-inside">
          <li>CSS patronal: 12.25% sobre salario bruto</li>
          <li>CSS laboral: 9.75% sobre salario bruto (retención)</li>
          <li>Seguro Educativo patronal: 1.5% — laboral: 1.25%</li>
          <li>Planilla mensual (Form CSS-02): vence el 15 del mes siguiente</li>
        </ul>
      </div>

      {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Cargando...</div>}
      {!isLoading && obligaciones.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500 font-medium">Sin obligaciones CSS/SEA para {anio}</p>
          <p className="text-slate-400 text-sm mt-1">Las obligaciones se generan desde el calendario fiscal.</p>
        </div>
      )}

      {obligaciones.length > 0 && (
        <div className="space-y-2">
          {obligaciones.map((obl) => {
            const hoy   = new Date();
            const vence = new Date(obl.proximoVencimiento);
            const dias  = Math.round((vence - hoy) / (1000 * 60 * 60 * 24));
            const urgente = dias <= 7 && obl.estado === 'PENDIENTE';
            const BADGE = { PENDIENTE: 'bg-yellow-100 text-yellow-700', PRESENTADA: 'bg-blue-100 text-blue-700', PAGADA: 'bg-green-100 text-green-700', VENCIDA: 'bg-red-100 text-red-700' };
            return (
              <div key={obl.id} className={`flex items-center gap-4 p-4 rounded-xl border ${urgente || obl.estado === 'VENCIDA' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{obl.descripcion || obl.tipo}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>Vence: {formatFecha(obl.proximoVencimiento)}</span>
                    {obl.montoEstimado && <span className="font-semibold text-blue-700">Est: {formatUSD(obl.montoEstimado)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {urgente && <span className="text-xs font-bold text-red-600">{dias <= 0 ? 'VENCIDA' : `${dias}d`}</span>}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${BADGE[obl.estado] || BADGE.PENDIENTE}`}>{obl.estado}</span>
                  {(obl.estado === 'PENDIENTE' || obl.estado === 'VENCIDA') && (
                    <button onClick={() => setModalPago(obl)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                      Registrar pago
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalPago && <ModalPagoObl empresaId={empresaId} obligacion={modalPago} onCerrar={() => setModalPago(null)} />}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'empleados',    label: 'Empleados',   icon: Users },
  { id: 'planilla',     label: 'Planilla',    icon: Calculator },
  { id: 'obligaciones', label: 'Obligaciones',icon: ClipboardList },
];

export default function CSS() {
  const { empresaId } = useParams();
  const [tab, setTab] = useState('empleados');

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">CSS / SEA</h1>
        <p className="text-slate-500 text-sm mt-1">
          Caja de Seguro Social — planilla, cálculo de aportes y registro de pagos.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'empleados'    && <TabEmpleados    empresaId={empresaId} />}
      {tab === 'planilla'     && <TabPlanilla     empresaId={empresaId} />}
      {tab === 'obligaciones' && <TabObligaciones empresaId={empresaId} />}
    </div>
  );
}
