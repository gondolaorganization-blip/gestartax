import { NavLink, useParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Receipt, FileText, CreditCard,
  Users, Building, History, Bell, BarChart3, ChevronDown,
  LogOut, Plus, Building2, Stamp, TrendingDown, MapPin,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useAlertasCount } from '../hooks/useAlertasCount';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',         path: 'dashboard' },
  { icon: Calendar,        label: 'Calendario fiscal', path: 'calendario' },
  { icon: Receipt,         label: 'ITBMS',             path: 'itbms' },
  { icon: FileText,        label: 'ISR Anual',         path: 'isr' },
  { icon: CreditCard,      label: 'Anticipos ISR',     path: 'anticipos' },
  { icon: Users,           label: 'CSS / SEA',         path: 'css' },
  { icon: Building,        label: 'Aviso de operación',path: 'aviso-operacion' },
  { icon: Building2,       label: 'Inmuebles',         path: 'inmuebles' },
  { icon: Stamp,           label: 'Tasa Única',        path: 'tasa-unica' },
  { icon: TrendingDown,    label: 'Dividendos',        path: 'dividendos' },
  { icon: MapPin,          label: 'Municipales',       path: 'municipales' },
  { icon: History,         label: 'Historial',         path: 'historial' },
  { icon: Bell,            label: 'Alertas',           path: 'alertas', badge: true },
  { icon: BarChart3,       label: 'Reportes',          path: 'reportes' },
];

export default function Sidebar() {
  const { empresaId } = useParams();
  const navigate = useNavigate();
  const { usuario, empresaActual, logout } = useAuthStore();
  const [empresasOpen, setEmpresasOpen] = useState(false);
  const empresas = usuario?.empresas || [];

  const { data: conteoAlertas } = useAlertasCount(empresaId);
  const totalNoLeidas = conteoAlertas?.totalNoLeidas || 0;
  const tieneCriticas = (conteoAlertas?.criticas || 0) > 0;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleCambiarEmpresa(empresa) {
    useAuthStore.getState().setEmpresaActual(empresa);
    navigate(`/empresa/${empresa.id}/dashboard`);
    setEmpresasOpen(false);
  }

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100 flex flex-col h-screen fixed left-0 top-0 z-30 border-r border-slate-800/50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md shadow-blue-900/30">
            T
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">Gestar Tax</p>
            <p className="text-xs text-slate-400">Gestión tributaria</p>
          </div>
        </div>
      </div>

      {/* Selector de empresa */}
      <div className="px-3 py-3 border-b border-slate-800/60">
        <button
          onClick={() => setEmpresasOpen(!empresasOpen)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-800/70 transition-colors text-left"
        >
          <div className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0 border border-blue-500/20">
            <Building2 size={14} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {empresaActual?.nombre || 'Seleccionar empresa'}
            </p>
            {empresaActual?.ruc && (
              <p className="text-xs text-slate-500 truncate">RUC: {empresaActual.ruc}</p>
            )}
          </div>
          <ChevronDown
            size={14}
            className={`text-slate-500 transition-transform shrink-0 ${empresasOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {empresasOpen && (
          <div className="mt-1 bg-slate-800/80 rounded-xl overflow-hidden border border-slate-700/50">
            {empresas.map((eu) => (
              <button
                key={eu.empresa.id}
                onClick={() => handleCambiarEmpresa(eu.empresa)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-700/60 transition-colors ${
                  empresaActual?.id === eu.empresa.id ? 'bg-slate-700/60' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{eu.empresa.nombre}</p>
                  <p className="text-xs text-slate-500">{eu.empresa.regimen}</p>
                </div>
              </button>
            ))}
            <button
              onClick={() => { navigate('/empresas/nueva'); setEmpresasOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 border-t border-slate-700/50 transition-colors"
            >
              <Plus size={13} />
              <span className="text-xs">Agregar empresa</span>
            </button>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const to = `/empresa/${empresaId}/${item.path}`;
          const mostrarBadge = item.badge && totalNoLeidas > 0;

          return (
            <NavLink
              key={item.path}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`
              }
            >
              <Icon size={16} />
              <span className="flex-1">{item.label}</span>
              {mostrarBadge && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center ${
                  tieneCriticas
                    ? 'bg-red-500 text-white'
                    : 'bg-yellow-500 text-slate-900'
                }`}>
                  {totalNoLeidas > 99 ? '99+' : totalNoLeidas}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Usuario */}
      <div className="px-3 py-3 border-t border-slate-800/60">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full flex items-center justify-center text-xs font-bold text-slate-200 shrink-0 border border-slate-600/50">
            {usuario?.nombre?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{usuario?.nombre}</p>
            <p className="text-xs text-slate-500 truncate">{usuario?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
