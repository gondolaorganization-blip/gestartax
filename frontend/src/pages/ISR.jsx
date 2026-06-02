import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isrApi } from '../api/isr.api';
import { formatUSD, formatFecha, MESES_NOMBRE } from '../utils/format';
import { Plus, Calculator, X, CheckCircle, Clock, TrendingUp, TrendingDown, Info } from 'lucide-react';

// ─── Componente: Comparador de métodos ───────────────────────────────────────

function ComparadorMetodos({ resultado }) {
  if (!resultado) return null;
  const { impuestoMetodoA, impuestoMetodoB, metodoPagado, impuestoCausado } = resultado;
  const usaA = metodoPagado === 'A';

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className={`rounded-xl border-2 p-4 ${usaA ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 opacity-75'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Método A</span>
          {usaA && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">Aplica</span>}
        </div>
        <p className="text-2xl font-bold text-slate-900">{formatUSD(impuestoMetodoA)}</p>
        <p className="text-xs text-slate-500 mt-1">25% × Renta Neta</p>
        <p className="text-xs text-slate-400">({formatUSD(resultado.rentaNeta)} renta neta)</p>
      </div>
      <div className={`rounded-xl border-2 p-4 ${!usaA ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-slate-50 opacity-75'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Método B (CAIR)</span>
          {!usaA && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">Aplica</span>}
        </div>
        <p className="text-2xl font-bold text-slate-900">{formatUSD(impuestoMetodoB)}</p>
        <p className="text-xs text-slate-500 mt-1">4.67% × Ingresos Brutos</p>
        <p className="text-xs text-slate-400">(Contribución Alternativa)</p>
      </div>
    </div>
  );
}

// ─── Modal: Formulario ISR ────────────────────────────────────────────────────

function FormularioISR({ empresaId, declExistente, onGuardado, onCerrar }) {
  const anioHoy = new Date().getFullYear();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    anio:                 declExistente?.anio                 ?? anioHoy - 1,
    ingresosBrutos:       declExistente?.ingresosBrutos       ?? '',
    gastosDeducibles:     declExistente?.gastosDeducibles     ?? '',
    anticiposPagados:     declExistente?.anticiposPagados     ?? '',
    retencionesRecibidas: declExistente?.retencionesRecibidas ?? '',
    otrosCreditos:        declExistente?.otrosCreditos        ?? '',
    observaciones:        declExistente?.observaciones        ?? '',
  });

  const [resultado, setResultado] = useState(
    declExistente
      ? {
          rentaNeta:        Number(declExistente.rentaNeta),
          impuestoMetodoA:  Number(declExistente.impuestoMetodoA),
          impuestoMetodoB:  Number(declExistente.impuestoMetodoB),
          metodoPagado:     declExistente.metodoPagado,
          impuestoCausado:  Number(declExistente.impuestoCausado),
          totalCreditos:    Number(declExistente.anticiposPagados) + Number(declExistente.retencionesRecibidas) + Number(declExistente.otrosCreditos),
          saldo:            Number(declExistente.saldo),
        }
      : null
  );
  const [error, setError] = useState('');

  const parseMonto = (v) => (v === '' ? 0 : parseFloat(v) || 0);

  function calcularLocal() {
    const ing  = parseMonto(form.ingresosBrutos);
    const gas  = parseMonto(form.gastosDeducibles);
    const ant  = parseMonto(form.anticiposPagados);
    const ret  = parseMonto(form.retencionesRecibidas);
    const otr  = parseMonto(form.otrosCreditos);

    const rentaNeta      = Math.round((ing - gas) * 100) / 100;
    const impuestoA      = rentaNeta > 0 ? Math.round(rentaNeta * 0.25 * 100) / 100 : 0;
    const impuestoB      = Math.round(ing * 0.0467 * 100) / 100;
    const impuestoCausado = Math.max(impuestoA, impuestoB);
    const metodoPagado   = impuestoA >= impuestoB ? 'A' : 'B';
    const totalCreditos  = Math.round((ant + ret + otr) * 100) / 100;
    const saldo          = Math.round((impuestoCausado - totalCreditos) * 100) / 100;

    setResultado({ rentaNeta, impuestoMetodoA: impuestoA, impuestoMetodoB: impuestoB, impuestoCausado, metodoPagado, totalCreditos, saldo });
  }

  const guardarMut = useMutation({
    mutationFn: (datos) => declExistente
      ? isrApi.actualizar(empresaId, declExistente.id, datos)
      : isrApi.crear(empresaId, datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['isr', empresaId] });
      qc.invalidateQueries({ queryKey: ['anticipos', empresaId] });
      onGuardado?.();
    },
    onError: (e) => setError(e.response?.data?.error || 'Error al guardar'),
  });

  function handleGuardar(estado = 'BORRADOR') {
    setError('');
    guardarMut.mutate({
      anio:                 parseInt(form.anio),
      ingresosBrutos:       parseMonto(form.ingresosBrutos),
      gastosDeducibles:     parseMonto(form.gastosDeducibles),
      anticiposPagados:     parseMonto(form.anticiposPagados),
      retencionesRecibidas: parseMonto(form.retencionesRecibidas),
      otrosCreditos:        parseMonto(form.otrosCreditos),
      observaciones:        form.observaciones,
      estado,
    });
  }

  const campoMonto = (key, label, placeholder, nota) => (
    <div key={key}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {nota && <p className="text-xs text-slate-400 mb-1">{nota}</p>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
        <input
          type="number" min="0" step="0.01"
          value={form[key]}
          onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setResultado(null); }}
          className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          placeholder={placeholder || '0.00'}
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Declaración ISR Anual</h2>
            <p className="text-xs text-slate-500">Impuesto Sobre la Renta — Método A vs Método B CAIR</p>
          </div>
          <button onClick={onCerrar} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Año fiscal */}
          {!declExistente && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Año fiscal</label>
              <select
                value={form.anio}
                onChange={(e) => setForm({ ...form, anio: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[anioHoy - 2, anioHoy - 1, anioHoy].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}

          {/* Ingresos y gastos */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ingresos y gastos</h3>
            <div className="grid grid-cols-2 gap-4">
              {campoMonto('ingresosBrutos',   'Ingresos brutos del período *', '0.00', 'Total de ingresos antes de deducciones')}
              {campoMonto('gastosDeducibles', 'Gastos deducibles',             '0.00', 'Gastos permitidos por el Código Fiscal')}
            </div>
            {resultado && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between text-sm">
                <span className="text-slate-600">Renta neta:</span>
                <span className={`font-bold ${resultado.rentaNeta >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                  {resultado.rentaNeta < 0 ? `(${formatUSD(Math.abs(resultado.rentaNeta))})` : formatUSD(resultado.rentaNeta)}
                  {resultado.rentaNeta < 0 && <span className="ml-2 text-xs text-red-500 font-normal">Pérdida fiscal</span>}
                </span>
              </div>
            )}
          </div>

          {/* Comparador de métodos */}
          {resultado && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Comparación de métodos</h3>
              <ComparadorMetodos resultado={resultado} />
            </div>
          )}

          {/* Créditos */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Créditos aplicables</h3>
            <div className="grid grid-cols-3 gap-4">
              {campoMonto('anticiposPagados',     'Anticipos pagados',                  '0.00', 'Cuotas 1ra, 2da y 3ra')}
              {campoMonto('retencionesRecibidas', 'Retenciones recibidas',              '0.00', '10% servicios profesionales')}
              {campoMonto('otrosCreditos',        'Otros créditos',                     '0.00', 'Créditos fiscales adicionales')}
            </div>
          </div>

          {/* Botón calcular */}
          <button
            onClick={calcularLocal}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 hover:border-blue-400 text-blue-600 hover:bg-blue-50 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Calculator size={16} />
            Calcular ISR
          </button>

          {/* Resultado final */}
          {resultado && (
            <div className="bg-slate-900 rounded-xl p-5 text-white">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Liquidación ISR</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Método aplicado</span>
                  <span className="font-semibold">
                    Método {resultado.metodoPagado}
                    {resultado.metodoPagado === 'B' && <span className="ml-1 text-xs text-orange-300">(CAIR)</span>}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Impuesto causado</span>
                  <span className="font-semibold text-white">{formatUSD(resultado.impuestoCausado)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Créditos totales</span>
                  <span>({formatUSD(resultado.totalCreditos)})</span>
                </div>
                <div className={`border-t border-slate-700 pt-3 flex justify-between items-center text-lg font-bold ${resultado.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  <span>{resultado.saldo > 0 ? 'Saldo a pagar' : 'Saldo a favor'}</span>
                  <span>{formatUSD(Math.abs(resultado.saldo))}</span>
                </div>
              </div>
            </div>
          )}

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

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancelar</button>
          <button
            onClick={() => handleGuardar('BORRADOR')}
            disabled={guardarMut.isPending}
            className="px-4 py-2 text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium disabled:opacity-60"
          >
            Guardar borrador
          </button>
          <button
            onClick={() => handleGuardar('PRESENTADA')}
            disabled={guardarMut.isPending}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60"
          >
            {guardarMut.isPending ? 'Guardando...' : 'Presentar declaración'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de declaración ISR ───────────────────────────────────────────────

const ESTADO_BADGE = {
  BORRADOR:   'bg-slate-100 text-slate-700',
  PRESENTADA: 'bg-blue-100 text-blue-700',
  PAGADA:     'bg-green-100 text-green-700',
};

function TarjetaISR({ decl, onEditar }) {
  const saldoAPagar = Number(decl.saldo) > 0;
  const usaCAIR = decl.metodoPagado === 'B';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">ISR {decl.anio}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Vence: {formatFecha(decl.fechaVencimiento)}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_BADGE[decl.estado] || ESTADO_BADGE.BORRADOR}`}>
          {decl.estado}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-slate-500">Ingresos brutos</p>
          <p className="text-base font-semibold text-slate-900">{formatUSD(decl.ingresosBrutos)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Renta neta</p>
          <p className={`text-base font-semibold ${Number(decl.rentaNeta) >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
            {Number(decl.rentaNeta) < 0 ? `(${formatUSD(Math.abs(decl.rentaNeta))})` : formatUSD(decl.rentaNeta)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Método aplicado</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${usaCAIR ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
              Método {decl.metodoPagado}
            </span>
            {usaCAIR && <span className="text-xs text-slate-400">CAIR 4.67%</span>}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500">Impuesto causado</p>
          <p className="text-base font-semibold text-slate-900">{formatUSD(decl.impuestoCausado)}</p>
        </div>
      </div>

      <div className={`rounded-lg p-3 flex items-center justify-between ${saldoAPagar ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
        <div>
          <p className="text-xs font-medium text-slate-600">{saldoAPagar ? 'Saldo a pagar' : 'Saldo a favor'}</p>
          <p className={`text-xl font-bold ${saldoAPagar ? 'text-red-700' : 'text-green-700'}`}>
            {formatUSD(Math.abs(Number(decl.saldo)))}
          </p>
          {Number(decl.anticiposPagados) > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              Anticipos aplicados: {formatUSD(decl.anticiposPagados)}
            </p>
          )}
        </div>
        {decl.estado !== 'PAGADA' && (
          <button
            onClick={() => onEditar(decl)}
            className="text-sm text-blue-600 hover:underline"
          >
            Editar
          </button>
        )}
      </div>

      {/* Comparación compacta */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div className="text-center">
          <p>Método A</p>
          <p className={`font-semibold text-sm ${!usaCAIR ? 'text-blue-700' : 'text-slate-700'}`}>
            {formatUSD(decl.impuestoMetodoA)}
          </p>
        </div>
        <div className="text-center">
          <p>Método B</p>
          <p className={`font-semibold text-sm ${usaCAIR ? 'text-orange-700' : 'text-slate-700'}`}>
            {formatUSD(decl.impuestoMetodoB)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ISR ─────────────────────────────────────────────────────

export default function ISR() {
  const { empresaId } = useParams();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [declEditar, setDeclEditar] = useState(null);
  const [formProyeccion, setFormProyeccion] = useState({
    ingresosBrutos: '', gastosDeducibles: '',
    anticiposPagados: '', retencionesRecibidas: '', otrosCreditos: '',
  });
  const [proyeccion, setProyeccion] = useState(null);

  const { data: declaraciones = [], isLoading } = useQuery({
    queryKey: ['isr', empresaId],
    queryFn: () => isrApi.listar(empresaId).then((r) => r.data),
    enabled: !!empresaId,
  });

  function abrirEditar(decl) { setDeclEditar(decl); setModalAbierto(true); }
  function cerrarModal() { setModalAbierto(false); setDeclEditar(null); }

  function calcularProyeccion() {
    const p = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;
    const ing  = p(formProyeccion.ingresosBrutos);
    const gas  = p(formProyeccion.gastosDeducibles);
    const ant  = p(formProyeccion.anticiposPagados);
    const ret  = p(formProyeccion.retencionesRecibidas);
    const otr  = p(formProyeccion.otrosCreditos);

    const rentaNeta     = Math.round((ing - gas) * 100) / 100;
    const metA          = rentaNeta > 0 ? Math.round(rentaNeta * 0.25 * 100) / 100 : 0;
    const metB          = Math.round(ing * 0.0467 * 100) / 100;
    const causado       = Math.max(metA, metB);
    const metodo        = metA >= metB ? 'A' : 'B';
    const totalCreditos = Math.round((ant + ret + otr) * 100) / 100;
    const saldo         = Math.round((causado - totalCreditos) * 100) / 100;
    const porCuota      = Math.round((causado / 3) * 100) / 100;
    setProyeccion({ rentaNeta, metA, metB, causado, metodo, totalCreditos, saldo, porCuota });
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ISR Anual</h1>
          <p className="text-slate-500 text-sm mt-0.5">Impuesto Sobre la Renta — Declaración jurada anual</p>
        </div>
        <button
          onClick={() => { setDeclEditar(null); setModalAbierto(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nueva declaración
        </button>
      </div>

      {/* Nota informativa */}
      <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 space-y-1">
          <p><strong>Método A:</strong> 25% sobre la renta neta (ingresos − gastos deducibles)</p>
          <p><strong>Método B CAIR:</strong> 4.67% sobre los ingresos brutos — Contribución Alternativa del ISR</p>
          <p>Se paga el <strong>mayor</strong> de los dos métodos. Si el Método B resulta menor, el contribuyente puede optar por el Método A.</p>
        </div>
      </div>

      {/* Grid de declaraciones */}
      {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Cargando...</div>}

      {!isLoading && declaraciones.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400 text-sm">No hay declaraciones ISR registradas</p>
          <button
            onClick={() => setModalAbierto(true)}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            Crear primera declaración
          </button>
        </div>
      )}

      {declaraciones.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {declaraciones.map((d) => (
            <TarjetaISR key={d.id} decl={d} onEditar={abrirEditar} />
          ))}
        </div>
      )}

      {/* Simulador de proyección */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <Calculator size={16} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Simulador de cierre fiscal</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Estime el ISR neto a pagar considerando ingresos, gastos y créditos ya aplicados
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Ingresos y gastos */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ingresos y gastos proyectados</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'ingresosBrutos',   label: 'Ingresos brutos',    nota: 'Total de ingresos del período' },
                { key: 'gastosDeducibles', label: 'Gastos deducibles',  nota: 'Gastos permitidos por el Código Fiscal' },
              ].map(({ key, label, nota }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
                  <p className="text-xs text-slate-400 mb-1.5">{nota}</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" min="0" step="0.01"
                      value={formProyeccion[key]}
                      onChange={(e) => { setFormProyeccion({ ...formProyeccion, [key]: e.target.value }); setProyeccion(null); }}
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Créditos fiscales */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Créditos fiscales aplicables</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'anticiposPagados',     label: 'Anticipos pagados',       nota: 'Cuotas 1ra, 2da y 3ra ya pagadas' },
                { key: 'retencionesRecibidas', label: 'Retenciones recibidas',   nota: '10% sobre servicios profesionales' },
                { key: 'otrosCreditos',        label: 'Otros créditos',          nota: 'Créditos fiscales adicionales' },
              ].map(({ key, label, nota }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
                  <p className="text-xs text-slate-400 mb-1.5">{nota}</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" min="0" step="0.01"
                      value={formProyeccion[key]}
                      onChange={(e) => { setFormProyeccion({ ...formProyeccion, [key]: e.target.value }); setProyeccion(null); }}
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={calcularProyeccion}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-200"
          >
            <Calculator size={15} />
            Calcular ISR estimado
          </button>
        </div>

        {proyeccion && (
          <div className="mt-6 space-y-4">
            {/* Comparación de métodos */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">Renta neta</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{formatUSD(proyeccion.rentaNeta)}</p>
              </div>
              <div className={`rounded-xl p-3 border-2 ${proyeccion.metodo === 'A' ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  Método A (25%)
                  {proyeccion.metodo === 'A' && <span className="text-blue-600 font-bold">← aplica</span>}
                </p>
                <p className={`text-sm font-bold mt-0.5 ${proyeccion.metodo === 'A' ? 'text-blue-700' : 'text-slate-600'}`}>{formatUSD(proyeccion.metA)}</p>
              </div>
              <div className={`rounded-xl p-3 border-2 ${proyeccion.metodo === 'B' ? 'border-orange-400 bg-orange-50' : 'border-slate-200 bg-slate-50'}`}>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  Método B (4.67%)
                  {proyeccion.metodo === 'B' && <span className="text-orange-600 font-bold">← aplica</span>}
                </p>
                <p className={`text-sm font-bold mt-0.5 ${proyeccion.metodo === 'B' ? 'text-orange-700' : 'text-slate-600'}`}>{formatUSD(proyeccion.metB)}</p>
              </div>
            </div>

            {/* Liquidación neta */}
            <div className="bg-slate-900 rounded-xl p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Liquidación estimada</p>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Impuesto causado (Método {proyeccion.metodo})</span>
                  <span className="font-semibold text-white">{formatUSD(proyeccion.causado)}</span>
                </div>
                {proyeccion.totalCreditos > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Total créditos aplicados</span>
                    <span className="text-green-400">({formatUSD(proyeccion.totalCreditos)})</span>
                  </div>
                )}
                <div className={`border-t border-slate-700 pt-3 flex justify-between items-center text-lg font-bold ${proyeccion.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  <span>{proyeccion.saldo > 0 ? 'Saldo a pagar' : 'Saldo a favor'}</span>
                  <span>{formatUSD(Math.abs(proyeccion.saldo))}</span>
                </div>
                <div className="border-t border-slate-700 pt-3">
                  <p className="text-xs text-slate-400 mb-1">Anticipos año siguiente (basados en impuesto causado)</p>
                  <div className="flex justify-between text-slate-300 text-xs">
                    <span>Cada cuota (3 cuotas: mar, jun, sep)</span>
                    <span className="font-semibold text-white">{formatUSD(proyeccion.porCuota)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {modalAbierto && (
        <FormularioISR
          empresaId={empresaId}
          declExistente={declEditar}
          onGuardado={cerrarModal}
          onCerrar={cerrarModal}
        />
      )}
    </div>
  );
}
