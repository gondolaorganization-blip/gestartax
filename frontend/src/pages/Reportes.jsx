import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { reporteApi, descargarArchivo } from '../api/reporte.api';
import { formatFecha } from '../utils/format';

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: 5 }, (_, i) => ANIO_ACTUAL - i);

function TarjetaReporte({ icono, titulo, descripcion, onDescargar, cargando }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="text-3xl">{icono}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-800">{titulo}</h3>
          <p className="text-sm text-slate-500 mt-1">{descripcion}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onDescargar('pdf')}
          disabled={cargando}
          className="py-2 px-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {cargando ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : '📄'}
          PDF
        </button>
        <button
          onClick={() => onDescargar('excel')}
          disabled={cargando}
          className="py-2 px-3 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {cargando ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : '📊'}
          Excel
        </button>
      </div>
    </div>
  );
}

export default function Reportes() {
  const { empresaActual } = useAuthStore();
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [cargando, setCargando] = useState({ itbms: false, isr: false, posicion: false });
  const [error, setError] = useState(null);

  const empresaId = empresaActual?.id;
  const ruc = empresaActual?.ruc || empresaId;

  async function descargar(tipo, formato = 'pdf') {
    if (!empresaId) return;
    setCargando((prev) => ({ ...prev, [tipo]: true }));
    setError(null);
    try {
      const ext = formato === 'excel' ? 'xlsx' : 'pdf';
      let resp;
      let nombre;
      if (tipo === 'itbms') {
        resp = await reporteApi.itbms(empresaId, anio, formato);
        nombre = `itbms_${ruc}_${anio}.${ext}`;
      } else if (tipo === 'isr') {
        resp = await reporteApi.isr(empresaId, anio, formato);
        nombre = `isr_${ruc}_${anio}.${ext}`;
      } else {
        resp = await reporteApi.posicionFiscal(empresaId, anio, formato);
        nombre = `posicion_fiscal_${ruc}_${anio}.${ext}`;
      }
      descargarArchivo(resp.data, nombre);
    } catch (err) {
      const msg = err.response?.data
        ? await err.response.data.text?.().then(JSON.parse).then((d) => d.error).catch(() => 'Error al generar el reporte')
        : 'Error al generar el reporte';
      setError(msg);
    } finally {
      setCargando((prev) => ({ ...prev, [tipo]: false }));
    }
  }

  if (!empresaActual) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Selecciona una empresa para generar reportes.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reportes PDF</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Genera reportes fiscales en PDF listos para presentar a la DGI.
        </p>
      </div>

      {/* Selector de año */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex items-center gap-4">
        <div className="text-slate-600 text-sm font-medium">Año fiscal:</div>
        <div className="flex gap-2">
          {ANIOS.map((a) => (
            <button
              key={a}
              onClick={() => setAnio(a)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                anio === a
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-slate-400">
          Empresa: <span className="font-medium text-slate-600">{empresaActual.nombre}</span>
        </div>
      </div>

      {/* Error global */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Tarjetas de reportes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <TarjetaReporte
          icono="📊"
          titulo="Reporte ITBMS Anual"
          descripcion={`Detalle mensual de declaraciones ITBMS del año ${anio}: ventas gravadas, débito, crédito y saldo.`}
          onDescargar={(formato) => descargar('itbms', formato)}
          cargando={cargando.itbms}
        />
        <TarjetaReporte
          icono="📋"
          titulo="Declaración ISR Anual"
          descripcion={`Cálculo del Impuesto sobre la Renta ${anio}: Método A vs CAIR, anticipos y saldo a pagar.`}
          onDescargar={(formato) => descargar('isr', formato)}
          cargando={cargando.isr}
        />
        <TarjetaReporte
          icono="📁"
          titulo="Posición Fiscal Consolidada"
          descripcion={`Vista ejecutiva del estado tributario: ITBMS, ISR, anticipos, obligaciones vencidas y próximos vencimientos.`}
          onDescargar={(formato) => descargar('posicion', formato)}
          cargando={cargando.posicion}
        />
      </div>

      {/* Información de reportes */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Contenido de cada reporte</h2>
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex gap-3">
            <span className="text-blue-600 font-medium w-44 shrink-0">ITBMS Anual</span>
            <span>Tabla con los 12 meses: ventas por tasa (7%/10%/15%), débito, crédito fiscal con arrastre del mes anterior, saldo y estado de cada declaración.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-600 font-medium w-44 shrink-0">ISR Anual</span>
            <span>Cálculo dual Método A (25% renta neta) vs Método B CAIR (4.67% ingresos brutos), método aplicable, créditos, anticipos y saldo final.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-600 font-medium w-44 shrink-0">Posición Consolidada</span>
            <span>Resumen ejecutivo con indicadores ITBMS, ISR, anticipos ISR, obligaciones vencidas y agenda de próximos 30 días con nivel de urgencia.</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-400 flex items-center gap-2">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Los reportes reflejan los datos ingresados en Gestar Tax. Generado: {formatFecha(new Date())}
        </div>
      </div>
    </div>
  );
}
