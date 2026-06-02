import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dividendosApi } from '../api/dividendos.api';
import { formatUSD, formatFecha } from '../utils/format';
import { Plus, X, Calculator, Info } from 'lucide-react';

const ANIO_ACTUAL = new Date().getFullYear();
const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all';

const R = (n) => Math.round(Number(n) * 100) / 100;

function calcular(f) {
  const utilidad = R(parseFloat(f.utilidadNeta) || 0);
  const divLocal  = R(parseFloat(f.dividendosLocales) || 0);
  const divExt    = R(parseFloat(f.dividendosExtranjeros) || 0);
  const retLocal  = R(divLocal * 0.10);
  const retExt    = R(divExt   * 0.05);
  const baseComp  = R(Math.max(utilidad - divLocal - divExt, 0));
  const comp      = R(baseComp * 0.10);
  return { retLocal, retExt, baseComp, comp, total: R(retLocal + retExt + comp) };
}

const ESTADO_CLS = { BORRADOR: 'bg-slate-100 text-slate-600', PRESENTADA: 'bg-blue-100 text-blue-700', PAGADA: 'bg-green-100 text-green-700' };

function FormularioDividendos({ empresaId, decl, onCerrar }) {
  const qc = useQueryClient();
  const esEdicion = !!decl;
  const [form, setForm] = useState({
    anio:                  decl?.anio                  ?? ANIO_ACTUAL - 1,
    utilidadNeta:          decl?.utilidadNeta          ?? '',
    dividendosLocales:     decl?.dividendosLocales     ?? '',
    dividendosExtranjeros: decl?.dividendosExtranjeros ?? '',
    observaciones:         decl?.observaciones         ?? '',
  });
  const [error, setError] = useState('');
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const calc = calcular(form);

  const mut = useMutation({
    mutationFn: (estado) => esEdicion
      ? dividendosApi.actualizar(empresaId, decl.id, { ...form, estado })
      : dividendosApi.crear(empresaId, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dividendos', empresaId] }); onCerrar(); },
    onError: (e) => setError(e.response?.data?.error || 'Error al guardar'),
  });

  const montoInput = (key, label, nota) => (
    <div key={key}>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      {nota && <p className="text-xs text-slate-400 mb-1.5">{nota}</p>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
        <input type="number" min="0" step="0.01" value={form[key]}
          onChange={(e) => f(key, e.target.value)}
          className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          placeholder="0.00" />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{esEdicion ? 'Editar' : 'Nueva'} Declaración de Dividendos</h2>
            <p className="text-xs text-slate-400 mt-0.5">Impuesto complementario y retención de dividendos</p>
          </div>
          <button onClick={onCerrar} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{error}</div>}

          {!esEdicion && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Año fiscal</label>
              <select value={form.anio} onChange={(e) => f('anio', e.target.value)} className={inputCls}>
                {[ANIO_ACTUAL - 2, ANIO_ACTUAL - 1, ANIO_ACTUAL].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Resultado del período</p>
            {montoInput('utilidadNeta', 'Utilidad neta del período *', 'Ganancia neta después de impuesto sobre la renta')}
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dividendos distribuidos</p>
            <div className="grid grid-cols-2 gap-3">
              {montoInput('dividendosLocales',     'Dividendos — fuente local',     'Tasa de retención: 10%')}
              {montoInput('dividendosExtranjeros', 'Dividendos — fuente extranjera','Tasa de retención: 5%')}
            </div>
          </div>

          {/* Preview de liquidación */}
          {(parseFloat(form.utilidadNeta) > 0 || parseFloat(form.dividendosLocales) > 0 || parseFloat(form.dividendosExtranjeros) > 0) && (
            <div className="bg-slate-900 rounded-xl p-5 text-white text-sm space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Liquidación estimada</p>
              {calc.retLocal > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Retención dividendos locales (10%)</span>
                  <span className="font-semibold">{formatUSD(calc.retLocal)}</span>
                </div>
              )}
              {calc.retExt > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Retención dividendos extranjeros (5%)</span>
                  <span className="font-semibold">{formatUSD(calc.retExt)}</span>
                </div>
              )}
              {calc.baseComp > 0 && (
                <>
                  <div className="flex justify-between text-slate-300 border-t border-slate-700 pt-2">
                    <span>Base complementario (utilidad no distribuida)</span>
                    <span>{formatUSD(calc.baseComp)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Impuesto complementario (10%)</span>
                    <span className="font-semibold">{formatUSD(calc.comp)}</span>
                  </div>
                </>
              )}
              <div className="border-t border-slate-700 pt-3 flex justify-between text-lg font-bold text-white">
                <span>Total a pagar</span>
                <span>{formatUSD(calc.total)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observaciones</label>
            <textarea value={form.observaciones} onChange={(e) => f('observaciones', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900">Cancelar</button>
          <button onClick={() => mut.mutate('BORRADOR')} disabled={!form.utilidadNeta || mut.isPending}
            className="px-4 py-2.5 text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-medium disabled:opacity-60">
            Guardar borrador
          </button>
          <button onClick={() => mut.mutate('PRESENTADA')} disabled={!form.utilidadNeta || mut.isPending}
            className="flex-1 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold disabled:opacity-60 transition-all">
            {mut.isPending ? 'Guardando...' : 'Presentar declaración'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dividendos() {
  const { empresaId } = useParams();
  const [modal, setModal] = useState(null);

  const { data: declaraciones = [], isLoading } = useQuery({
    queryKey: ['dividendos', empresaId],
    queryFn: () => dividendosApi.listar(empresaId).then((r) => r.data),
    enabled: !!empresaId,
  });

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dividendos y Complementario</h1>
          <p className="text-slate-500 text-sm mt-1">Retención sobre dividendos distribuidos e impuesto complementario sobre utilidades no distribuidas.</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-200">
          <Plus size={15} /> Nueva declaración
        </button>
      </div>

      {/* Referencia normativa */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden mb-6 text-xs">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <p className="font-bold text-slate-700 uppercase tracking-wider">Referencia — Dividendos y Complementario</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-200">
          <div className="p-4">
            <p className="font-semibold text-slate-700 mb-2">Dividendos — fuente local</p>
            <p className="text-slate-600">Retención del <strong className="text-blue-700">10%</strong> sobre el monto distribuido a accionistas de fuente panameña.</p>
          </div>
          <div className="p-4">
            <p className="font-semibold text-slate-700 mb-2">Dividendos — fuente extranjera</p>
            <p className="text-slate-600">Retención del <strong className="text-blue-700">5%</strong> sobre dividendos provenientes de fuente extranjera.</p>
          </div>
          <div className="p-4">
            <p className="font-semibold text-slate-700 mb-2">Impuesto complementario</p>
            <p className="text-slate-600"><strong className="text-blue-700">10%</strong> sobre la utilidad neta <em>no distribuida</em> como dividendo. Evita la elusión fiscal.</p>
          </div>
        </div>
        <div className="px-4 py-2.5 bg-blue-50 border-t border-slate-200 text-blue-800">
          <strong>Fórmula complementario:</strong> (Utilidad neta − Dividendos distribuidos) × 10%
        </div>
      </div>

      {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Cargando...</div>}
      {!isLoading && declaraciones.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-medium">Sin declaraciones registradas</p>
          <button onClick={() => setModal({})} className="mt-3 text-sm text-blue-600 hover:underline">Crear primera declaración</button>
        </div>
      )}

      {declaraciones.length > 0 && (
        <div className="space-y-4">
          {declaraciones.map((d) => {
            const calcado = calcular({ utilidadNeta: d.utilidadNeta, dividendosLocales: d.dividendosLocales, dividendosExtranjeros: d.dividendosExtranjeros });
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Período {d.anio}</h3>
                    {d.fechaPresentacion && <p className="text-xs text-slate-400">Presentado: {formatFecha(d.fechaPresentacion)}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ESTADO_CLS[d.estado] || ESTADO_CLS.BORRADOR}`}>{d.estado}</span>
                    {d.estado !== 'PAGADA' && (
                      <button onClick={() => setModal(d)} className="text-xs text-blue-600 hover:underline">Editar</button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-500 mb-0.5">Utilidad neta</p>
                    <p className="font-bold text-slate-900">{formatUSD(d.utilidadNeta)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-500 mb-0.5">Dividendos distribuidos</p>
                    <p className="font-bold text-slate-900">{formatUSD(Number(d.dividendosLocales) + Number(d.dividendosExtranjeros))}</p>
                    {Number(d.dividendosLocales) > 0 && <p className="text-slate-400">Local: {formatUSD(d.dividendosLocales)}</p>}
                    {Number(d.dividendosExtranjeros) > 0 && <p className="text-slate-400">Ext: {formatUSD(d.dividendosExtranjeros)}</p>}
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-500 mb-0.5">Base complementario</p>
                    <p className="font-bold text-slate-900">{formatUSD(d.baseComplementario)}</p>
                    <p className="text-slate-400">Retención: {formatUSD(Number(d.retencionLocal) + Number(d.retencionExtranjera))}</p>
                  </div>
                  <div className={`rounded-xl p-3 border-2 ${Number(d.totalImpuesto) > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <p className="text-slate-500 mb-0.5">Total impuesto</p>
                    <p className={`text-lg font-bold ${Number(d.totalImpuesto) > 0 ? 'text-red-700' : 'text-green-700'}`}>{formatUSD(d.totalImpuesto)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <FormularioDividendos
          empresaId={empresaId}
          decl={Object.keys(modal).length > 0 ? modal : null}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}
