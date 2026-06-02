import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itbmsApi } from '../api/itbms.api';
import { formatUSD, formatNumero, nombreMes, periodoLabel, formatFecha, MESES_NOMBRE } from '../utils/format';
import { Plus, ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle, X, Calculator, DollarSign } from 'lucide-react';

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADO_BADGE = {
  BORRADOR:   { label: 'Borrador',   cls: 'bg-slate-100 text-slate-700' },
  PRESENTADA: { label: 'Presentada', cls: 'bg-blue-100 text-blue-700'   },
  PAGADA:     { label: 'Pagada',     cls: 'bg-green-100 text-green-700'  },
};

const ESTADO_ICON = {
  BORRADOR:   Clock,
  PRESENTADA: CheckCircle,
  PAGADA:     CheckCircle,
};

const CAMPOS_VENTAS = [
  { key: 'ventasGravadas7',  label: 'Ventas gravadas al 7%',  tasa: '7%',  placeholder: '0.00', nota: 'Bienes y servicios generales' },
  { key: 'ventasGravadas10', label: 'Ventas gravadas al 10%', tasa: '10%', placeholder: '0.00', nota: 'Hoteles y restaurantes' },
  { key: 'ventasGravadas15', label: 'Ventas gravadas al 15%', tasa: '15%', placeholder: '0.00', nota: 'Alcohol, tabaco y productos selectivos' },
  { key: 'ventasExentas',    label: 'Ventas exentas',          tasa: null,  placeholder: '0.00', nota: 'Alimentos básicos, medicamentos, etc.' },
  { key: 'ventasNoSujetas',  label: 'Ventas no sujetas',       tasa: null,  placeholder: '0.00', nota: 'Exportaciones, servicios al exterior' },
];

// ─── Formulario 430 ───────────────────────────────────────────────────────────

function Formulario430({ empresaId, declExistente, creditoAnterior, onGuardado, onCerrar }) {
  const anioHoy = new Date().getFullYear();
  const mesHoy  = new Date().getMonth() + 1;
  const qc = useQueryClient();

  const [form, setForm] = useState({
    mes:              declExistente?.mes  ?? mesHoy,
    anio:             declExistente?.anio ?? anioHoy,
    ventasGravadas7:  declExistente?.ventasGravadas7  ?? '',
    ventasGravadas10: declExistente?.ventasGravadas10 ?? '',
    ventasGravadas15: declExistente?.ventasGravadas15 ?? '',
    ventasExentas:    declExistente?.ventasExentas    ?? '',
    ventasNoSujetas:  declExistente?.ventasNoSujetas  ?? '',
    itbmsCredito:     declExistente?.itbmsCredito     ?? '',
    observaciones:    declExistente?.observaciones    ?? '',
  });

  const [preview, setPreview] = useState(null);
  const [error, setError]     = useState('');

  const parseMonto = (v) => (v === '' ? 0 : parseFloat(v) || 0);

  function calcularLocal() {
    const v7  = parseMonto(form.ventasGravadas7);
    const v10 = parseMonto(form.ventasGravadas10);
    const v15 = parseMonto(form.ventasGravadas15);
    const cred = parseMonto(form.itbmsCredito);
    const ant  = Number(declExistente?.creditoMesAnterior ?? creditoAnterior ?? 0);

    const d7  = Math.round(v7  * 0.07 * 100) / 100;
    const d10 = Math.round(v10 * 0.10 * 100) / 100;
    const d15 = Math.round(v15 * 0.15 * 100) / 100;
    const debitoTotal  = Math.round((d7 + d10 + d15) * 100) / 100;
    const creditoTotal = Math.round((cred + ant) * 100) / 100;
    const saldo        = Math.round((debitoTotal - creditoTotal) * 100) / 100;

    setPreview({
      itbmsDebito7: d7, itbmsDebito10: d10, itbmsDebito15: d15,
      itbmsDebito: debitoTotal,
      itbmsCredito: cred, creditoMesAnterior: ant, creditoTotal,
      totalVentas: Math.round((v7 + v10 + v15 + parseMonto(form.ventasExentas) + parseMonto(form.ventasNoSujetas)) * 100) / 100,
      saldo: saldo > 0 ? saldo : 0,
      saldoAFavor: saldo < 0 ? Math.abs(saldo) : 0,
    });
  }

  const crearMut = useMutation({
    mutationFn: (datos) => declExistente
      ? itbmsApi.actualizar(empresaId, declExistente.id, datos)
      : itbmsApi.crear(empresaId, datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['itbms', empresaId] });
      onGuardado?.();
    },
    onError: (e) => setError(e.response?.data?.error || 'Error al guardar'),
  });

  function handleGuardar(estado = 'BORRADOR') {
    setError('');
    const datos = {
      ...form,
      mes: parseInt(form.mes),
      anio: parseInt(form.anio),
      ventasGravadas7:  parseMonto(form.ventasGravadas7),
      ventasGravadas10: parseMonto(form.ventasGravadas10),
      ventasGravadas15: parseMonto(form.ventasGravadas15),
      ventasExentas:    parseMonto(form.ventasExentas),
      ventasNoSujetas:  parseMonto(form.ventasNoSujetas),
      itbmsCredito:     parseMonto(form.itbmsCredito),
      estado,
    };
    crearMut.mutate(datos);
  }

  const creditoAnt = Number(declExistente?.creditoMesAnterior ?? creditoAnterior ?? 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Formulario 430 — ITBMS</h2>
            <p className="text-sm text-slate-500">Declaración y pago del ITBMS</p>
          </div>
          <button onClick={onCerrar} className="p-2 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {/* Período */}
          {!declExistente && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mes</label>
                <select
                  value={form.mes}
                  onChange={(e) => setForm({ ...form, mes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MESES_NOMBRE.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Año</label>
                <select
                  value={form.anio}
                  onChange={(e) => setForm({ ...form, anio: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[anioHoy - 1, anioHoy, anioHoy + 1].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {declExistente && (
            <div className="bg-slate-50 rounded-lg px-4 py-2.5 text-sm text-slate-700 font-medium">
              Período: {nombreMes(declExistente.mes)} {declExistente.anio}
            </div>
          )}

          {/* Sección I — Ventas */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Sección I — Ventas del período
            </h3>
            <div className="space-y-2">
              {CAMPOS_VENTAS.map((campo) => (
                <div key={campo.key} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700">{campo.label}</span>
                      {campo.tasa && (
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          {campo.tasa}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{campo.nota}</p>
                  </div>
                  <div className="col-span-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form[campo.key]}
                        onChange={(e) => { setForm({ ...form, [campo.key]: e.target.value }); setPreview(null); }}
                        className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  {campo.tasa && (
                    <div className="col-span-3 text-right">
                      <span className="text-sm font-medium text-slate-700">
                        {formatUSD(
                          parseMonto(form[campo.key]) *
                          (campo.tasa === '7%' ? 0.07 : campo.tasa === '10%' ? 0.10 : 0.15)
                        )}
                      </span>
                      <p className="text-xs text-slate-400">ITBMS</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sección II — Crédito fiscal */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Sección II — Crédito fiscal
            </h3>
            <div className="space-y-3">
              {creditoAnt > 0 && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-800">Saldo a favor del mes anterior</p>
                    <p className="text-xs text-green-600">Aplicado automáticamente</p>
                  </div>
                  <span className="text-sm font-bold text-green-700">{formatUSD(creditoAnt)}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ITBMS pagado en compras del mes
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.itbmsCredito}
                    onChange={(e) => { setForm({ ...form, itbmsCredito: e.target.value }); setPreview(null); }}
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botón calcular */}
          <button
            type="button"
            onClick={calcularLocal}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 hover:border-blue-400 text-blue-600 hover:bg-blue-50 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Calculator size={16} />
            Calcular liquidación
          </button>

          {/* Liquidación */}
          {preview && (
            <div className="bg-slate-900 rounded-xl p-5 text-white">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Liquidación — Formulario 430
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Total ventas</span>
                  <span>{formatUSD(preview.totalVentas)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2">
                  <p className="text-xs text-slate-500 mb-1">ITBMS débito (cobrado)</p>
                  {preview.itbmsDebito7  > 0 && <div className="flex justify-between text-slate-300"><span>Al 7%</span><span>{formatUSD(preview.itbmsDebito7)}</span></div>}
                  {preview.itbmsDebito10 > 0 && <div className="flex justify-between text-slate-300"><span>Al 10%</span><span>{formatUSD(preview.itbmsDebito10)}</span></div>}
                  {preview.itbmsDebito15 > 0 && <div className="flex justify-between text-slate-300"><span>Al 15%</span><span>{formatUSD(preview.itbmsDebito15)}</span></div>}
                  <div className="flex justify-between font-semibold text-white mt-1">
                    <span>Total débito</span>
                    <span>{formatUSD(preview.itbmsDebito)}</span>
                  </div>
                </div>
                <div className="border-t border-slate-700 pt-2">
                  <p className="text-xs text-slate-500 mb-1">ITBMS crédito (pagado)</p>
                  {preview.itbmsCredito > 0 && <div className="flex justify-between text-slate-300"><span>Compras del mes</span><span>{formatUSD(preview.itbmsCredito)}</span></div>}
                  {preview.creditoMesAnterior > 0 && <div className="flex justify-between text-slate-300"><span>Saldo mes anterior</span><span>{formatUSD(preview.creditoMesAnterior)}</span></div>}
                  <div className="flex justify-between font-semibold text-white mt-1">
                    <span>Total crédito</span>
                    <span>{formatUSD(preview.creditoTotal)}</span>
                  </div>
                </div>
                <div className={`border-t border-slate-700 pt-3 flex justify-between items-center text-lg font-bold ${preview.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  <span>{preview.saldo > 0 ? 'Impuesto a pagar' : 'Saldo a favor'}</span>
                  <span>{formatUSD(preview.saldo > 0 ? preview.saldo : preview.saldoAFavor)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Notas adicionales..."
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
            Cancelar
          </button>
          <button
            onClick={() => handleGuardar('BORRADOR')}
            disabled={crearMut.isPending}
            className="px-4 py-2 text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium disabled:opacity-60"
          >
            Guardar borrador
          </button>
          <button
            onClick={() => handleGuardar('PRESENTADA')}
            disabled={crearMut.isPending}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60"
          >
            {crearMut.isPending ? 'Guardando...' : 'Presentar declaración'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal registrar pago ITBMS ───────────────────────────────────────────────

function ModalPagoITBMS({ empresaId, decl, onCerrar }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    referenciaBanco: '',
    banco: '',
    observaciones: '',
  });
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () => itbmsApi.actualizar(empresaId, decl.id, {
      mes:              decl.mes,
      anio:             decl.anio,
      ventasGravadas7:  Number(decl.ventasGravadas7),
      ventasGravadas10: Number(decl.ventasGravadas10),
      ventasGravadas15: Number(decl.ventasGravadas15),
      ventasExentas:    Number(decl.ventasExentas),
      ventasNoSujetas:  Number(decl.ventasNoSujetas),
      itbmsCredito:     Number(decl.itbmsCredito),
      estado: 'PAGADA',
      observaciones: [decl.observaciones, form.observaciones, form.banco && `Banco: ${form.banco}`, form.referenciaBanco && `Ref: ${form.referenciaBanco}`].filter(Boolean).join(' | '),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['itbms', empresaId] });
      qc.invalidateQueries({ queryKey: ['dashboard', empresaId] });
      onCerrar();
    },
    onError: (e) => setError(e.response?.data?.error || 'Error al registrar el pago'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registrar pago ITBMS</h2>
            <p className="text-xs text-slate-500 mt-0.5">{nombreMes(decl.mes)} {decl.anio} — {formatUSD(decl.saldo)} a pagar</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{error}</div>}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center">
            <span className="text-sm text-blue-700 font-medium">Monto a pagar</span>
            <span className="text-lg font-bold text-blue-800">{formatUSD(decl.saldo)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de pago *</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Banco</label>
              <input type="text" value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })}
                placeholder="Banco Nacional..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Referencia / Comprobante</label>
            <input type="text" value={form.referenciaBanco} onChange={(e) => setForm({ ...form, referenciaBanco: e.target.value })}
              placeholder="Nº de comprobante o referencia..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observaciones</label>
            <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              rows={2} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={!form.fecha || mut.isPending}
            className="flex-1 py-2.5 text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold disabled:opacity-60 transition-all">
            {mut.isPending ? 'Registrando...' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fila de declaración en el historial ─────────────────────────────────────

function FilaDeclaracion({ decl, onEditar, onPagar }) {
  const [expandida, setExpandida] = useState(false);
  const estado = ESTADO_BADGE[decl.estado] || ESTADO_BADGE.BORRADOR;
  const Icon   = ESTADO_ICON[decl.estado] || Clock;
  const saldoPositivo = Number(decl.saldo) > 0;

  return (
    <>
      <tr
        className="hover:bg-slate-50 cursor-pointer border-b border-slate-100"
        onClick={() => setExpandida(!expandida)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Icon size={14} className={decl.estado === 'PAGADA' ? 'text-green-500' : decl.estado === 'PRESENTADA' ? 'text-blue-500' : 'text-slate-400'} />
            <span className="text-sm font-medium text-slate-800">
              {nombreMes(decl.mes)} {decl.anio}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatUSD(decl.totalVentas)}</td>
        <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatUSD(decl.itbmsDebito)}</td>
        <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatUSD(Number(decl.itbmsCredito) + Number(decl.creditoMesAnterior))}</td>
        <td className="px-4 py-3 text-right">
          <span className={`text-sm font-bold ${saldoPositivo ? 'text-red-600' : 'text-green-600'}`}>
            {saldoPositivo ? formatUSD(decl.saldo) : `(${formatUSD(decl.saldoAFavor)})`}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${estado.cls}`}>
            {estado.label}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {expandida ? <ChevronUp size={14} className="text-slate-400 ml-auto" /> : <ChevronDown size={14} className="text-slate-400 ml-auto" />}
        </td>
      </tr>
      {expandida && (
        <tr className="bg-slate-50">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Ventas</p>
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between"><span>7%</span><span>{formatUSD(decl.ventasGravadas7)}</span></div>
                  <div className="flex justify-between"><span>10%</span><span>{formatUSD(decl.ventasGravadas10)}</span></div>
                  <div className="flex justify-between"><span>15%</span><span>{formatUSD(decl.ventasGravadas15)}</span></div>
                  <div className="flex justify-between"><span>Exentas</span><span>{formatUSD(decl.ventasExentas)}</span></div>
                  <div className="flex justify-between"><span>No sujetas</span><span>{formatUSD(decl.ventasNoSujetas)}</span></div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">ITBMS débito</p>
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between"><span>7%</span><span>{formatUSD(decl.itbmsDebito7)}</span></div>
                  <div className="flex justify-between"><span>10%</span><span>{formatUSD(decl.itbmsDebito10)}</span></div>
                  <div className="flex justify-between"><span>15%</span><span>{formatUSD(decl.itbmsDebito15)}</span></div>
                  <div className="flex justify-between font-semibold"><span>Total</span><span>{formatUSD(decl.itbmsDebito)}</span></div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Información</p>
                <div className="space-y-1 text-slate-600 text-xs">
                  <div>Vence: {formatFecha(decl.fechaVencimiento)}</div>
                  {decl.fechaPresentacion && <div>Presentado: {formatFecha(decl.fechaPresentacion)}</div>}
                  {decl.observaciones && <div className="mt-2 text-slate-500">{decl.observaciones}</div>}
                </div>
                <div className="flex flex-col gap-2 mt-3">
                  {decl.estado !== 'PAGADA' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditar(decl); }}
                      className="text-xs text-blue-600 hover:underline text-left"
                    >
                      Editar declaración
                    </button>
                  )}
                  {(decl.estado === 'PRESENTADA' || decl.estado === 'BORRADOR') && Number(decl.saldo) > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onPagar(decl); }}
                      className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors w-fit"
                    >
                      <DollarSign size={12} />
                      Registrar pago
                    </button>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ITBMS() {
  const { empresaId } = useParams();
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(anioActual);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [declEditar, setDeclEditar] = useState(null);
  const [declPagar, setDeclPagar] = useState(null);

  const { data: resumen, isLoading } = useQuery({
    queryKey: ['itbms', empresaId, anio],
    queryFn: () => itbmsApi.resumenAnual(empresaId, anio).then((r) => r.data),
    enabled: !!empresaId,
  });

  const declaraciones = resumen?.declaraciones || [];
  const totales = resumen?.totales || {};

  // Saldo a favor del último mes con declaración
  const ultimaDecl = [...declaraciones].sort((a, b) => b.mes - a.mes)[0];
  const creditoAnterior = ultimaDecl?.saldoAFavor ?? 0;

  function abrirNueva() { setDeclEditar(null); setModalAbierto(true); }
  function abrirEditar(decl) { setDeclEditar(decl); setModalAbierto(true); }
  function cerrarModal() { setModalAbierto(false); setDeclEditar(null); }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ITBMS — Formulario 430</h1>
          <p className="text-slate-500 text-sm mt-0.5">Declaración mensual del Impuesto de Transferencia de Bienes Muebles y Servicios</p>
        </div>
        <button
          onClick={abrirNueva}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nueva declaración
        </button>
      </div>

      {/* Selector de año */}
      <div className="flex items-center gap-2 mb-5">
        {[anioActual - 1, anioActual].map((a) => (
          <button
            key={a}
            onClick={() => setAnio(a)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              anio === a ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Tarjetas resumen */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total ventas', value: formatUSD(totales.totalVentas), sub: `${anio}`, color: 'text-slate-900' },
            { label: 'ITBMS cobrado', value: formatUSD(totales.itbmsDebito), sub: 'Débito fiscal', color: 'text-blue-700' },
            { label: 'Impuesto pagado', value: formatUSD(totales.impuestoPagado), sub: 'Declaraciones pagadas', color: 'text-green-700' },
            { label: 'Pendiente de pago', value: formatUSD(totales.impuestePendiente), sub: 'Declaraciones presentadas', color: totales.impuestePendiente > 0 ? 'text-red-700' : 'text-slate-400' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Saldo a favor vigente */}
      {Number(creditoAnterior) > 0 && (
        <div className="mb-5 flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle size={18} className="text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Saldo a favor disponible: {formatUSD(creditoAnterior)}
            </p>
            <p className="text-xs text-green-600">
              Se aplicará automáticamente en la próxima declaración
            </p>
          </div>
        </div>
      )}

      {/* Tabla de declaraciones */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Declaraciones {anio}</h2>
        </div>

        {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Cargando...</div>}

        {!isLoading && declaraciones.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">No hay declaraciones en {anio}</p>
            <button
              onClick={abrirNueva}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Crear la primera declaración
            </button>
          </div>
        )}

        {declaraciones.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left">Período</th>
                  <th className="px-4 py-2 text-right">Total ventas</th>
                  <th className="px-4 py-2 text-right">Débito</th>
                  <th className="px-4 py-2 text-right">Crédito</th>
                  <th className="px-4 py-2 text-right">Saldo</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {declaraciones.map((decl) => (
                  <FilaDeclaracion key={decl.id} decl={decl} onEditar={abrirEditar} onPagar={setDeclPagar} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal pago */}
      {declPagar && (
        <ModalPagoITBMS
          empresaId={empresaId}
          decl={declPagar}
          onCerrar={() => setDeclPagar(null)}
        />
      )}

      {/* Modal Formulario 430 */}
      {modalAbierto && (
        <Formulario430
          empresaId={empresaId}
          declExistente={declEditar}
          creditoAnterior={creditoAnterior}
          onGuardado={cerrarModal}
          onCerrar={cerrarModal}
        />
      )}
    </div>
  );
}
