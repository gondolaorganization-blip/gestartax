import { useNavigate, useParams } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { useAlertasCount } from '../hooks/useAlertasCount';
import { useAuthStore } from '../store/auth.store';

const TITULOS = {
  dashboard:        'Dashboard',
  calendario:       'Calendario fiscal',
  itbms:            'ITBMS — Formulario 430',
  isr:              'ISR Anual',
  anticipos:        'Anticipos ISR',
  css:              'CSS / SEA',
  'aviso-operacion':'Aviso de Operación',
  inmuebles:        'Impuesto de Inmueble',
  'tasa-unica':     'Tasa Única',
  dividendos:       'Dividendos y Complementario',
  municipales:      'Impuestos Municipales',
  historial:        'Historial de declaraciones',
  alertas:          'Alertas fiscales',
  reportes:         'Reportes',
};

export default function TopBar() {
  const { empresaId } = useParams();
  const navigate = useNavigate();
  const empresaActual = useAuthStore((s) => s.empresaActual);
  const { data: conteo } = useAlertasCount(empresaId);
  const noLeidas = conteo?.totalNoLeidas || 0;
  const tieneCriticas = (conteo?.criticas || 0) > 0;

  const pathParts = window.location.pathname.split('/');
  const moduloActual = pathParts[pathParts.length - 1];
  const titulo = TITULOS[moduloActual] || '';

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between shadow-sm shadow-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm min-w-0">
        <span className="text-slate-400 truncate max-w-[180px] font-medium">
          {empresaActual?.nombre || ''}
        </span>
        {titulo && (
          <>
            <ChevronRight size={14} className="text-slate-300 shrink-0" />
            <span className="font-semibold text-slate-800">{titulo}</span>
          </>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 shrink-0">
        {empresaActual?.regimen && empresaActual.regimen !== 'GENERAL' && (
          <span className="hidden sm:inline text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-semibold">
            {empresaActual.regimen}
          </span>
        )}
        {empresaActual?.esGranContribuyente && (
          <span className="hidden sm:inline text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-1 rounded-full font-semibold">
            Gran Contribuyente
          </span>
        )}

        <button
          onClick={() => navigate(`/empresa/${empresaId}/alertas`)}
          className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-colors"
          title="Ver alertas"
        >
          <Bell size={18} className={noLeidas > 0 ? 'text-slate-700' : 'text-slate-400'} />
          {noLeidas > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 text-xs font-bold px-1 py-0.5 rounded-full min-w-[1.1rem] text-center leading-none ${
              tieneCriticas ? 'bg-red-500 text-white' : 'bg-yellow-400 text-slate-900'
            }`}>
              {noLeidas > 99 ? '99+' : noLeidas}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
