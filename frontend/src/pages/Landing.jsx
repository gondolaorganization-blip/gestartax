import { Link } from 'react-router-dom';

const MODULOS = [
  { icon: '📅', titulo: 'Calendario tributario', desc: 'Todas las fechas de la DGI en un solo lugar. Nunca más te pierdas un vencimiento.' },
  { icon: '🧾', titulo: 'ITBMS', desc: 'Cálculo del débito y crédito fiscal, ITBMS neto a pagar y control mensual.' },
  { icon: '📊', titulo: 'ISR', desc: 'Impuesto sobre la renta de sociedades: método tradicional (25%) y CAIR.' },
  { icon: '💸', titulo: 'Anticipos', desc: 'Control y proyección de los anticipos mensuales del ISR.' },
  { icon: '🏥', titulo: 'CSS / SEA', desc: 'Cuotas obrero-patronales del Seguro Social y Seguro Educativo.' },
  { icon: '🏢', titulo: 'Aviso de Operación', desc: 'Seguimiento del impuesto anual del aviso de operación.' },
  { icon: '🏠', titulo: 'Inmuebles', desc: 'Impuesto de bienes inmuebles por propiedad, con tarifas vigentes.' },
  { icon: '📈', titulo: 'Tasa Única', desc: 'Recordatorio y control de la tasa única anual de sociedades.' },
  { icon: '💰', titulo: 'Dividendos', desc: 'Impuesto de dividendos y complementario calculado automáticamente.' },
  { icon: '🏛️', titulo: 'Municipales', desc: 'Impuestos municipales de tu negocio organizados y al día.' },
  { icon: '🔔', titulo: 'Alertas', desc: 'Avisos automáticos antes de cada vencimiento para evitar multas.' },
  { icon: '📄', titulo: 'Reportes', desc: 'Reportes en PDF listos para tu contador o para la DGI.' },
];

const VENTAJAS = [
  { icon: '🇵🇦', titulo: 'Hecho para Panamá', desc: 'Diseñado con la legislación tributaria panameña: ITBMS, ISR, CSS, DGI. No es software genérico adaptado.' },
  { icon: '⏰', titulo: 'Cero multas por olvido', desc: 'El calendario y las alertas te avisan de cada obligación antes de que venza. Tranquilidad todo el año.' },
  { icon: '🏬', titulo: 'Multiempresa', desc: 'Lleva las obligaciones de varias empresas desde una sola cuenta. Ideal para contadores y grupos.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ── Nav ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <span className="text-white text-lg font-bold">T</span>
            </div>
            <span className="font-bold text-lg tracking-tight">Gestar Tax</span>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <a href="#modulos" className="hidden sm:block text-slate-600 hover:text-slate-900 font-medium px-2">Funciones</a>
            <Link to="/login" className="text-slate-600 hover:text-slate-900 font-semibold px-3 py-2">Iniciar sesión</Link>
            <Link to="/register" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-4 py-2 rounded-xl shadow-md shadow-blue-200 transition-all">
              Empezar gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50">
        <div className="max-w-6xl mx-auto px-5 py-20 sm:py-28 text-center">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-6">
            Gestión tributaria panameña
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Tus impuestos en Panamá,<br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> bajo control.</span>
          </h1>
          <p className="text-lg text-slate-600 mt-6 max-w-2xl mx-auto">
            Calcula ITBMS, ISR, CSS y más; recibe alertas antes de cada vencimiento de la DGI y genera reportes en segundos. Todo en un solo lugar.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
            <Link to="/register" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-7 py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all">
              Crear cuenta gratis
            </Link>
            <Link to="/login" className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-7 py-3.5 rounded-xl transition-all">
              Iniciar sesión
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-5">Sin tarjeta de crédito · Empieza en minutos</p>
        </div>
      </section>

      {/* ── Ventajas ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="grid sm:grid-cols-3 gap-6">
          {VENTAJAS.map((v) => (
            <div key={v.titulo} className="text-center px-4">
              <div className="text-4xl mb-4">{v.icon}</div>
              <h3 className="font-bold text-lg mb-2">{v.titulo}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Módulos ───────────────────────────────────────────── */}
      <section id="modulos" className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold tracking-tight">Todo lo que tu empresa debe a la DGI</h2>
            <p className="text-slate-600 mt-3 max-w-xl mx-auto">Cada obligación tributaria panameña, calculada y organizada por ti.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULOS.map((m) => (
              <div key={m.titulo} className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5 transition-all">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl mb-4">{m.icon}</div>
                <h3 className="font-bold mb-1.5">{m.titulo}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl px-8 py-14 text-center shadow-xl shadow-blue-200">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Deja las hojas de cálculo atrás</h2>
          <p className="text-blue-100 mt-3 max-w-xl mx-auto">Empieza hoy a llevar tus impuestos de forma ordenada y sin sustos con la DGI.</p>
          <Link to="/register" className="inline-block mt-8 bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-3.5 rounded-xl shadow-lg transition-all">
            Crear mi cuenta gratis
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">T</span>
            </div>
            <span className="font-semibold text-slate-700">Gestar Tax</span>
            <span className="text-slate-400">· por GestarSoft</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/login" className="hover:text-slate-900">Iniciar sesión</Link>
            <Link to="/register" className="hover:text-slate-900">Registrarse</Link>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 pb-6">© {new Date().getFullYear()} Gestar Tax · Gestión tributaria para Panamá 🇵🇦</p>
      </footer>
    </div>
  );
}
