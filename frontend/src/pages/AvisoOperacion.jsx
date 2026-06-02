import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { obligacionApi } from '../api/obligacion.api';
import { pagoApi } from '../api/pago.api';
import { formatUSD, formatFecha } from '../utils/format';
import { useAuthStore } from '../store/auth.store';
import { Calculator, X } from 'lucide-react';

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = [ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2];

const ESTADO_BADGE = {
  PENDIENTE:  { label: 'Pendiente',  cls: 'bg-yellow-100 text-yellow-700' },
  PRESENTADA: { label: 'Presentado', cls: 'bg-blue-100   text-blue-700'   },
  PAGADA:     { label: 'Pagado',     cls: 'bg-green-100  text-green-700'   },
  VENCIDA:    { label: 'Vencido',    cls: 'bg-red-100    text-red-700'     },
};

const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all';

// ─── Lógica de cálculo — Art. 1004 Código Fiscal ─────────────────────────────
function calcularAvisoOperacion(activoNeto, esZLC) {
  const base = parseFloat(activoNeto) || 0;
  if (base <= 0) return null;

  if (esZLC) {
    // ZLC/Zonas francas: 0.5% sobre activos netos, mín $100, máx $50,000
    const calculado = base * 0.005;
    return Math.min(Math.max(calculado, 100), 50000);
  }
  // General / REM / SEM: 2% sobre capital (activo neto), mín $100, máx $60,000
  const calculado = base * 0.02;
  return Math.min(Math.max(calculado, 100), 60000);
}

// ─── Calculador de impuesto ───────────────────────────────────────────────────
function Calculador({ regimen }) {
  const esZLC = regimen === 'ZLC';
  const [base, setBase] = useState('');
  const resultado = calcularAvisoOperacion(base, esZLC);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <Calculator size={16} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Calculador — Aviso de Operación</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {esZLC
              ? 'Régimen ZLC: 0.5% sobre activos netos (mín. $100 — máx. $50,000)'
              : 'Art. 1004 Código Fiscal: 2% sobre capital / activo neto (mín. $100 — máx. $60,000)'}
          </p>
        </div>
        {esZLC && (
          <span className="ml-auto text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
            Zona Libre / Franca
          </span>
        )}
      </div>

      {/* Nota sobre cálculo del capital */}
      {!esZLC && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800">
          <strong>Capital (activo neto)</strong> = Activo total − Pasivo total al cierre del período fiscal.<br/>
          <span className="text-amber-700">Nota: Para sucursales o subsidiarias, no se incluye en el pasivo las sumas adeudadas a una compañía relacionada o matriz domiciliada fuera de Panamá.</span>
        </div>
      )}

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {esZLC ? 'Activos netos (USD)' : 'Capital / Activo neto al cierre del período (USD)'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number" min="0" step="0.01"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              placeholder="Activo total − Pasivo total"
            />
          </div>
        </div>

        <div className={`flex-1 rounded-xl p-3 border-2 transition-all ${resultado !== null ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
          <p className="text-xs text-slate-500 mb-0.5">Impuesto estimado</p>
          <p className={`text-xl font-bold ${resultado !== null ? 'text-blue-800' : 'text-slate-300'}`}>
            {resultado !== null ? formatUSD(resultado) : '—'}
          </p>
          {resultado !== null && (
            <p className="text-xs text-slate-500 mt-0.5">
              {resultado === 100 ? 'Mínimo aplicado ($100)' :
               resultado === (esZLC ? 50000 : 60000) ? `Máximo aplicado (${formatUSD(esZLC ? 50000 : 60000)})` :
               `${esZLC ? '0.5' : '2'}% × ${formatUSD(parseFloat(base))}`}
            </p>
          )}
        </div>
      </div>

      {resultado !== null && (
        <p className="text-xs text-slate-400 mt-3">
          Se declara y paga junto con la declaración de renta anual ante la DGI. Vence el 31 de marzo.
        </p>
      )}
    </div>
  );
}

// ─── Modal registrar pago ─────────────────────────────────────────────────────
function ModalRegistrar({ empresaId, obligacion, onCerrar }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    monto: obligacion.montoEstimado ? String(obligacion.montoEstimado) : '',
    fecha: new Date().toISOString().slice(0, 10),
    referenciaBanco: '',
    banco: '',
    observaciones: '',
  });
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () => pagoApi.registrar(empresaId, { obligacionId: obligacion.id, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aviso-obligaciones', empresaId] });
      onCerrar();
    },
    onError: (e) => setError(e.response?.data?.error || 'Error al registrar'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registrar pago — Aviso de Operación</h2>
            <p className="text-xs text-slate-400 mt-0.5">DGI — Dirección General de Ingresos</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 text-sm">
            <p className="font-medium text-slate-800">{obligacion.descripcion || 'Aviso de Operación'}</p>
            <p className="text-xs text-slate-500 mt-0.5">Vencimiento: {formatFecha(obligacion.proximoVencimiento)}</p>
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Monto (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" step="0.01" value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fecha de pago *</label>
              <input type="date" value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Banco</label>
              <input type="text" value={form.banco}
                onChange={(e) => setForm({ ...form, banco: e.target.value })}
                placeholder="Banco Nacional..." className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Referencia DGI</label>
              <input type="text" value={form.referenciaBanco}
                onChange={(e) => setForm({ ...form, referenciaBanco: e.target.value })}
                placeholder="Número de comprobante DGI..." className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observaciones</label>
            <textarea value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              rows={2} className={`${inputCls} resize-none`} />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={!form.monto || !form.fecha || mut.isPending}
            className="flex-1 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold disabled:opacity-60 transition-all">
            {mut.isPending ? 'Guardando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AvisoOperacion() {
  const { empresaId } = useParams();
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [modal, setModal] = useState(null);

  const empresaActual = useAuthStore((s) => s.empresaActual);
  const regimen = empresaActual?.regimen || 'GENERAL';
  const esZLC   = regimen === 'ZLC';

  const { data: obligaciones = [], isLoading } = useQuery({
    queryKey: ['aviso-obligaciones', empresaId, anio],
    queryFn: () => obligacionApi.listar(empresaId, { tipo: 'AVISO_OPERACION', anio }).then((r) => r.data),
    enabled: !!empresaId,
  });

  const vigente = obligaciones.find((o) => o.estado === 'PAGADA' || o.estado === 'PRESENTADA');
  const vencidas = obligaciones.filter((o) => o.estado === 'VENCIDA');

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Aviso de Operación</h1>
        <p className="text-slate-500 text-sm mt-1">
          Impuesto anual de operación comercial — se declara y paga ante la DGI (Dirección General de Ingresos).
        </p>
      </div>

      {/* Selector de año */}
      <div className="flex items-center gap-2 mb-5">
        {ANIOS.map((a) => (
          <button key={a} onClick={() => setAnio(a)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${anio === a ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {a}
          </button>
        ))}
      </div>

      {/* Estado actual */}
      {!isLoading && obligaciones.length > 0 && (
        <div className={`rounded-2xl border p-5 mb-5 flex items-center gap-4 ${
          vigente ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="text-3xl">{vigente ? '✅' : '❌'}</div>
          <div>
            <p className={`font-semibold ${vigente ? 'text-green-800' : 'text-red-800'}`}>
              {vigente ? `Aviso de Operación ${anio} al día` : `Aviso de Operación ${anio} sin pagar`}
            </p>
            <p className={`text-sm mt-0.5 ${vigente ? 'text-green-600' : 'text-red-600'}`}>
              {vigente
                ? `Registrado — vencía ${formatFecha(vigente.proximoVencimiento)}`
                : vencidas.length > 0
                  ? 'Existen vencimientos pendientes de regularizar'
                  : 'Pendiente de declaración y pago ante la DGI'}
            </p>
          </div>
        </div>
      )}

      {/* Calculador */}
      <Calculador regimen={regimen} />

      {/* Información normativa */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden mb-5 text-xs">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <p className="font-bold text-slate-700 uppercase tracking-wider">Referencia — Aviso de Operación (Ley 5 de 2007)</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-200">
          <div className="p-4">
            <p className="font-semibold text-slate-700 mb-2">Régimen General / REM / SEM</p>
            <ul className="text-slate-600 space-y-1.5">
              <li className="flex justify-between"><span>Base</span><span className="font-semibold">Capital (activo neto)</span></li>
              <li className="flex justify-between"><span>Tasa</span><span className="font-bold text-blue-700">2%</span></li>
              <li className="flex justify-between"><span>Mínimo</span><span className="font-semibold">$100.00</span></li>
              <li className="flex justify-between"><span>Máximo</span><span className="font-semibold">$60,000.00</span></li>
            </ul>
            <p className="text-slate-400 mt-2">Capital = Activo total − Pasivo total</p>
          </div>
          <div className="p-4">
            <p className="font-semibold text-slate-700 mb-2">Zona Libre de Colón / Zonas Francas</p>
            <ul className="text-slate-600 space-y-1.5">
              <li className="flex justify-between"><span>Base</span><span className="font-semibold">Activos netos</span></li>
              <li className="flex justify-between"><span>Tasa</span><span className="font-bold text-amber-700">0.5%</span></li>
              <li className="flex justify-between"><span>Mínimo</span><span className="font-semibold">$100.00</span></li>
              <li className="flex justify-between"><span>Máximo</span><span className="font-semibold">$50,000.00</span></li>
            </ul>
            <p className="text-slate-400 mt-2">No requieren licencia comercial, sí el impuesto</p>
          </div>
        </div>
        <div className="px-4 py-3 bg-blue-50 border-t border-slate-200 text-blue-800">
          <strong>Pago:</strong> Se declara y paga junto con la declaración de renta anual ante la DGI — vence el <strong>31 de marzo</strong>.
          No aplica para empresas en ZLC o zonas francas la obligación de licencia comercial, pero sí el impuesto.
        </div>
      </div>

      {/* Lista de obligaciones */}
      {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Cargando...</div>}

      {!isLoading && obligaciones.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-medium">Sin registros para {anio}</p>
          <p className="text-slate-400 text-sm mt-1">Las obligaciones se generan automáticamente desde el calendario fiscal.</p>
        </div>
      )}

      {obligaciones.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Historial de renovaciones</h2>
          {obligaciones.map((obl) => {
            const badge = ESTADO_BADGE[obl.estado] || ESTADO_BADGE.PENDIENTE;
            const pagosRealizados = obl.pagos?.length || 0;
            return (
              <div key={obl.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{obl.descripcion || 'Aviso de Operación'}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>Vence: {formatFecha(obl.proximoVencimiento)}</span>
                    {obl.montoEstimado && <span className="font-semibold text-blue-700">Est: {formatUSD(obl.montoEstimado)}</span>}
                    {pagosRealizados > 0 && <span className="text-green-600">{pagosRealizados} pago(s) registrado(s)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                  {(obl.estado === 'PENDIENTE' || obl.estado === 'VENCIDA') && (
                    <button onClick={() => setModal(obl)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
                      Registrar pago
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && <ModalRegistrar empresaId={empresaId} obligacion={modal} onCerrar={() => setModal(null)} />}
    </div>
  );
}
