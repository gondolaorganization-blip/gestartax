import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inmuebleApi } from '../api/inmueble.api';
import { formatUSD, formatFecha } from '../utils/format';

const ANIO_ACTUAL = new Date().getFullYear();

const ESTADO_BADGE = {
  PENDIENTE: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700' },
  PAGADA:    { label: 'Pagada',    cls: 'bg-green-100  text-green-700'  },
  VENCIDA:   { label: 'Vencida',   cls: 'bg-red-100    text-red-700'    },
};

// ─── Cálculo de tasa client-side (espejo del backend) ─────────────────────────
function calcularTasa(valorCatastral, tipoUso) {
  const v = Number(valorCatastral) || 0;
  if (tipoUso === 'VIVIENDA_PRINCIPAL' || tipoUso === 'PATRIMONIO_FAMILIAR') {
    if (v <= 120000) return 0;
    if (v <= 700000) return 0.5;
    return 0.7;
  }
  if (v <= 30000)  return 0;
  if (v <= 250000) return 0.6;
  if (v <= 500000) return 0.8;
  return 1.0;
}

const TIPO_USO_LABEL = {
  VIVIENDA_PRINCIPAL: 'Vivienda principal',
  PATRIMONIO_FAMILIAR: 'Patrimonio familiar',
  OTRO: 'Otro (comercial, segunda residencia, terreno...)',
};

const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all';

// ─── Modal nueva propiedad ────────────────────────────────────────────────────
function ModalPropiedad({ empresaId, propiedad, onCerrar }) {
  const qc = useQueryClient();
  const esEdicion = !!propiedad;
  const [form, setForm] = useState({
    descripcion:    propiedad?.descripcion    ?? '',
    ubicacion:      propiedad?.ubicacion      ?? '',
    finca:          propiedad?.finca          ?? '',
    valorCatastral: propiedad?.valorCatastral ?? '',
    tipoUso:        propiedad?.tipoUso        ?? 'OTRO',
    exenta:         propiedad?.exenta         ?? false,
  });
  const [error, setError] = useState('');

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const tasa         = calcularTasa(form.valorCatastral, form.tipoUso);
  const impuestoAnual = Number(form.valorCatastral) * (tasa / 100);
  const exentoPorLey  = tasa === 0 && Number(form.valorCatastral) > 0;

  const mut = useMutation({
    mutationFn: () => esEdicion
      ? inmuebleApi.actualizar(empresaId, propiedad.id, form)
      : inmuebleApi.crear(empresaId, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inmuebles', empresaId] }); onCerrar(); },
    onError: (e) => setError(e.response?.data?.error || 'Error al guardar'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 overflow-y-auto py-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            {esEdicion ? 'Editar propiedad' : 'Nueva propiedad inmueble'}
          </h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descripción *</label>
            <input type="text" value={form.descripcion} onChange={(e) => f('descripcion', e.target.value)}
              placeholder="Local comercial Vía España, Oficina 203..." className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ubicación</label>
              <input type="text" value={form.ubicacion} onChange={(e) => f('ubicacion', e.target.value)}
                placeholder="Corregimiento, distrito..." className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Finca catastral</label>
              <input type="text" value={form.finca} onChange={(e) => f('finca', e.target.value)}
                placeholder="Nº de finca..." className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de uso *</label>
            <select value={form.tipoUso} onChange={(e) => f('tipoUso', e.target.value)} className={inputCls}>
              <option value="VIVIENDA_PRINCIPAL">Vivienda principal</option>
              <option value="PATRIMONIO_FAMILIAR">Patrimonio familiar</option>
              <option value="OTRO">Otro (comercial, segunda residencia, terreno...)</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              {form.tipoUso === 'VIVIENDA_PRINCIPAL' && 'Residencia habitual del propietario. Exenta hasta B/.120,000.'}
              {form.tipoUso === 'PATRIMONIO_FAMILIAR' && 'Bien familiar inscrito. Exento hasta B/.120,000.'}
              {form.tipoUso === 'OTRO' && 'Comercial, oficinas, segunda residencia, terrenos. Exento hasta B/.30,000.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Valor catastral (USD) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input type="number" step="0.01" value={form.valorCatastral} onChange={(e) => f('valorCatastral', e.target.value)}
                placeholder="0.00" className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
            </div>
          </div>

          {/* Preview de tasa calculada */}
          {Number(form.valorCatastral) > 0 && !form.exenta && (
            <div className={`rounded-xl p-4 border ${exentoPorLey ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">Tasa aplicable (Ley 66 de 2017)</span>
                <span className={`text-lg font-bold ${exentoPorLey ? 'text-green-700' : 'text-blue-800'}`}>
                  {exentoPorLey ? 'EXENTO' : `${tasa}%`}
                </span>
              </div>
              {!exentoPorLey && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Impuesto anual estimado</span>
                  <div className="text-right">
                    <span className="font-bold text-blue-900">{formatUSD(impuestoAnual)}</span>
                    <span className="text-blue-600 text-xs ml-2">({formatUSD(impuestoAnual / 3)} × 3 cuotas)</span>
                  </div>
                </div>
              )}
              {exentoPorLey && (
                <p className="text-xs text-green-700">
                  El valor catastral está por debajo del umbral de exención para {TIPO_USO_LABEL[form.tipoUso].toLowerCase()}.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <input type="checkbox" id="exenta" checked={form.exenta} onChange={(e) => f('exenta', e.target.checked)}
              className="h-4 w-4 accent-blue-600 border-slate-300 rounded" />
            <label htmlFor="exenta" className="text-sm text-slate-700">Exenta por resolución especial (override manual)</label>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={!form.descripcion || !form.valorCatastral || mut.isPending}
            className="flex-1 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold disabled:opacity-60 transition-all">
            {mut.isPending ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Agregar propiedad'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal confirmar pago de cuota ────────────────────────────────────────────
function ModalPagarCuota({ empresaId, propiedad, cuota, onCerrar }) {
  const qc = useQueryClient();
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () => inmuebleApi.pagarCuota(empresaId, propiedad.id, cuota.id, fechaPago),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inmuebles', empresaId] });
      onCerrar();
    },
    onError: (e) => setError(e.response?.data?.error || 'Error al registrar el pago'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Registrar pago de cuota</h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-slate-800">{propiedad.descripcion}</p>
            <p className="text-slate-600 mt-1">Cuota {cuota.numeroCuota} de 3 — {formatUSD(cuota.monto)}</p>
            <p className="text-slate-500 text-xs mt-0.5">Vence: {formatFecha(cuota.fechaVence)}</p>
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de pago</label>
            <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="flex-1 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-600">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={mut.isPending}
            className="flex-1 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-60">
            {mut.isPending ? 'Guardando...' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de propiedad ─────────────────────────────────────────────────────
function TarjetaPropiedad({ propiedad, empresaId, onEditar, onPagarCuota }) {
  const cuotasAnio = propiedad.cuotas.filter((c) => c.anio === ANIO_ACTUAL);
  const cuotasPagadas = cuotasAnio.filter((c) => c.estado === 'PAGADA').length;
  const impuestoAnual = Number(propiedad.valorCatastral) * (Number(propiedad.tasaImpuesto) / 100);

  const qc = useQueryClient();
  const genMut = useMutation({
    mutationFn: () => inmuebleApi.generarCuotas(empresaId, propiedad.id, ANIO_ACTUAL),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inmuebles', empresaId] }),
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-900">{propiedad.descripcion}</h3>
            {propiedad.exenta && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Exenta</span>}
            {!propiedad.activa && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inactiva</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            {propiedad.ubicacion && <span>📍 {propiedad.ubicacion}</span>}
            {propiedad.finca && <span>Finca: {propiedad.finca}</span>}
          </div>
        </div>
        <button onClick={() => onEditar(propiedad)} className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50">
          Editar
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">Valor catastral</p>
          <p className="text-sm font-bold text-slate-800">{formatUSD(propiedad.valorCatastral)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">Tipo / Tasa</p>
          <p className="text-xs font-semibold text-slate-700">
            {propiedad.tipoUso === 'VIVIENDA_PRINCIPAL' ? 'Vivienda principal' :
             propiedad.tipoUso === 'PATRIMONIO_FAMILIAR' ? 'Patr. familiar' : 'Otro'}
          </p>
          <p className="text-xs font-bold text-blue-600">{Number(propiedad.tasaImpuesto) === 0 ? 'Exento' : `${Number(propiedad.tasaImpuesto)}%`}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">Impuesto anual</p>
          <p className="text-sm font-bold text-slate-800">{propiedad.exenta || Number(propiedad.tasaImpuesto) === 0 ? 'Exento' : formatUSD(impuestoAnual)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">Cuotas {ANIO_ACTUAL}</p>
          <p className="text-sm font-bold text-slate-800">{cuotasPagadas}/3</p>
        </div>
      </div>

      {/* Cuotas */}
      {cuotasAnio.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Cuotas {ANIO_ACTUAL}</p>
          {cuotasAnio.map((cuota) => {
            const badge = ESTADO_BADGE[cuota.estado] || ESTADO_BADGE.PENDIENTE;
            const dias = Math.round((new Date(cuota.fechaVence) - new Date()) / (1000 * 60 * 60 * 24));
            return (
              <div key={cuota.id} className="flex items-center gap-3 text-sm">
                <span className="text-slate-500 w-16 shrink-0">Cuota {cuota.numeroCuota}</span>
                <span className="text-slate-700 font-medium w-24 shrink-0">{formatUSD(cuota.monto)}</span>
                <span className="text-slate-400 text-xs flex-1">Vence {formatFecha(cuota.fechaVence)}</span>
                {cuota.estado !== 'PAGADA' && dias <= 15 && (
                  <span className={`text-xs font-medium ${dias <= 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {dias <= 0 ? 'Vencida' : `${dias}d`}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                {cuota.estado !== 'PAGADA' && (
                  <button onClick={() => onPagarCuota(propiedad, cuota)}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded-lg transition-colors">
                    Pagar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Sin cuotas generadas para {ANIO_ACTUAL}</p>
          <button onClick={() => genMut.mutate()} disabled={genMut.isPending || propiedad.exenta}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg disabled:opacity-50 transition-colors">
            {genMut.isPending ? 'Generando...' : 'Generar cuotas'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Página Inmuebles ─────────────────────────────────────────────────────────
export default function Inmuebles() {
  const { empresaId } = useParams();
  const [modalPropiedad, setModalPropiedad] = useState(null);
  const [modalCuota, setModalCuota] = useState(null);

  const { data: propiedades = [], isLoading } = useQuery({
    queryKey: ['inmuebles', empresaId],
    queryFn: () => inmuebleApi.listar(empresaId).then((r) => r.data),
    enabled: !!empresaId,
  });

  const activas = propiedades.filter((p) => p.activa && !p.exenta);
  const impuestoTotal = activas.reduce(
    (s, p) => s + Number(p.valorCatastral) * (Number(p.tasaImpuesto) / 100), 0
  );
  const cuotasPagadas = propiedades.flatMap((p) => p.cuotas).filter((c) => c.anio === ANIO_ACTUAL && c.estado === 'PAGADA').length;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Impuesto de Inmuebles</h1>
          <p className="text-slate-500 text-sm mt-1">Registro de propiedades y cuotas trimestrales.</p>
        </div>
        <button onClick={() => setModalPropiedad({})}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nueva propiedad
        </button>
      </div>

      {/* Resumen */}
      {propiedades.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Propiedades activas</p>
            <p className="text-xl font-bold text-slate-900">{activas.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Impuesto anual total</p>
            <p className="text-xl font-bold text-slate-900">{formatUSD(impuestoTotal)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Cuotas pagadas {ANIO_ACTUAL}</p>
            <p className="text-xl font-bold text-green-700">{cuotasPagadas}</p>
          </div>
        </div>
      )}

      {/* Información normativa */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden mb-5 text-xs">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <p className="font-bold text-slate-700 uppercase tracking-wider">Tasas — Impuesto de Inmuebles (Ley 66 de 2017)</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-200">
          {/* Vivienda principal / Patrimonio familiar */}
          <div className="p-4">
            <p className="font-semibold text-slate-700 mb-2">Vivienda principal / Patrimonio familiar</p>
            <table className="w-full text-slate-600">
              <thead>
                <tr className="text-slate-400 font-semibold">
                  <th className="text-left pb-1">Valor catastral</th>
                  <th className="text-right pb-1">Tasa</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                {[
                  ['Hasta B/.120,000', '0% (exento)'],
                  ['B/.120,001 – B/.700,000', '0.5%'],
                  ['Más de B/.700,000', '0.7%'],
                ].map(([rango, tasa]) => (
                  <tr key={rango} className="border-t border-slate-100">
                    <td className="py-1">{rango}</td>
                    <td className="py-1 text-right font-semibold text-blue-700">{tasa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Otros inmuebles */}
          <div className="p-4">
            <p className="font-semibold text-slate-700 mb-2">Otros inmuebles (comercial, segunda residencia, terrenos)</p>
            <table className="w-full text-slate-600">
              <thead>
                <tr className="text-slate-400 font-semibold">
                  <th className="text-left pb-1">Valor catastral</th>
                  <th className="text-right pb-1">Tasa</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Hasta B/.30,000', '0% (exento)'],
                  ['B/.30,001 – B/.250,000', '0.6%'],
                  ['B/.250,001 – B/.500,000', '0.8%'],
                  ['Más de B/.500,000', '1.0%'],
                ].map(([rango, tasa]) => (
                  <tr key={rango} className="border-t border-slate-100">
                    <td className="py-1">{rango}</td>
                    <td className="py-1 text-right font-semibold text-blue-700">{tasa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
          <div className="px-4 py-2.5">
            <p className="font-semibold text-slate-700">Vencimientos (Art. 786)</p>
            <p className="text-slate-500 mt-0.5">1ra: 30 abr · 2da: 31 ago · 3ra: 31 dic</p>
          </div>
          <div className="px-4 py-2.5 bg-green-50">
            <p className="font-semibold text-green-800">10% descuento</p>
            <p className="text-green-700">Pago antes del último día de febrero</p>
          </div>
          <div className="px-4 py-2.5 bg-red-50">
            <p className="font-semibold text-red-800">10% recargo</p>
            <p className="text-red-700">Pago después del vencimiento</p>
          </div>
        </div>
      </div>

      {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Cargando propiedades...</div>}

      {!isLoading && propiedades.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
          <p className="text-slate-500 font-medium">Sin propiedades registradas</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Agrega las propiedades de la empresa para gestionar el impuesto de inmuebles.</p>
          <button onClick={() => setModalPropiedad({})}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Agregar primera propiedad
          </button>
        </div>
      )}

      {propiedades.length > 0 && (
        <div className="space-y-4">
          {propiedades.map((p) => (
            <TarjetaPropiedad
              key={p.id}
              propiedad={p}
              empresaId={empresaId}
              onEditar={setModalPropiedad}
              onPagarCuota={(prop, cuota) => setModalCuota({ propiedad: prop, cuota })}
            />
          ))}
        </div>
      )}

      {modalPropiedad !== null && (
        <ModalPropiedad
          empresaId={empresaId}
          propiedad={Object.keys(modalPropiedad).length > 0 ? modalPropiedad : null}
          onCerrar={() => setModalPropiedad(null)}
        />
      )}

      {modalCuota && (
        <ModalPagarCuota
          empresaId={empresaId}
          propiedad={modalCuota.propiedad}
          cuota={modalCuota.cuota}
          onCerrar={() => setModalCuota(null)}
        />
      )}
    </div>
  );
}
