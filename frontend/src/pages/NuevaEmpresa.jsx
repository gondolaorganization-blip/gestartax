import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import api from '../api/client';
import { ArrowLeft } from 'lucide-react';

const REGIMENES = [
  { value: 'GENERAL', label: 'Régimen General', desc: 'Contribuyente ordinario del territorio nacional' },
  { value: 'REM', label: 'Régimen de Exportador de Servicios', desc: 'Prestador de servicios al exterior (REM)' },
  { value: 'SEM', label: 'Sede de Empresas Multinacionales', desc: 'Sede regional de empresa multinacional (SEM)' },
  { value: 'ZLC', label: 'Zona Libre de Colón', desc: 'Empresa ubicada en la Zona Libre de Colón' },
];

const inputCls = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-300 transition-all';

export default function NuevaEmpresa() {
  const navigate = useNavigate();
  const setEmpresaActual = useAuthStore((s) => s.setEmpresaActual);
  const [form, setForm] = useState({
    nombre: '',
    ruc: '',
    dv: '',
    regimen: 'GENERAL',
    esGranContribuyente: false,
    actividadEconomica: '',
    email: '',
    telefono: '',
    direccion: '',
    representanteLegal: '',
  });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { data } = await api.post('/empresas', form);
      setEmpresaActual(data);
      navigate(`/empresa/${data.id}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la empresa');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-100 to-slate-200 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Botón volver */}
        {useAuthStore.getState().usuario?.empresas?.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => {
                const empresas = useAuthStore.getState().usuario?.empresas;
                const primera = empresas?.[0]?.empresa;
                if (primera) navigate(`/empresa/${primera.id}/dashboard`);
              }}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={15} />
              Volver al dashboard
            </button>
          </div>
        )}

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl mb-5 shadow-lg shadow-blue-200">
            <span className="text-white text-3xl font-bold">T</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Registrar empresa</h1>
          <p className="text-slate-500 text-sm mt-2">Ingrese el perfil tributario de su empresa</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-200/50 border border-slate-100 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <span className="shrink-0">⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Datos básicos */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">1</div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Datos de la empresa</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Razón social *</label>
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className={inputCls}
                    placeholder="Empresa S.A."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">RUC *</label>
                  <input
                    type="text"
                    required
                    value={form.ruc}
                    onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                    className={inputCls}
                    placeholder="8-123-456 o 155-123456-2-2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Dígito verificador (DV) *</label>
                  <input
                    type="text"
                    required
                    value={form.dv}
                    onChange={(e) => setForm({ ...form, dv: e.target.value })}
                    className={inputCls}
                    placeholder="45"
                    maxLength={3}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Actividad económica</label>
                  <input
                    type="text"
                    value={form.actividadEconomica}
                    onChange={(e) => setForm({ ...form, actividadEconomica: e.target.value })}
                    className={inputCls}
                    placeholder="Comercio al por menor, Servicios contables, etc."
                  />
                </div>
              </div>
            </div>

            {/* Régimen fiscal */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">2</div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Régimen fiscal</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {REGIMENES.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      form.regimen === r.value
                        ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="regimen"
                      value={r.value}
                      checked={form.regimen === r.value}
                      onChange={() => setForm({ ...form, regimen: r.value })}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{r.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <label className="flex items-center gap-3 mt-3 p-4 rounded-2xl border-2 border-slate-200 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all">
                <input
                  type="checkbox"
                  checked={form.esGranContribuyente}
                  onChange={(e) => setForm({ ...form, esGranContribuyente: e.target.checked })}
                  className="accent-blue-600 w-4 h-4"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Gran Contribuyente</p>
                  <p className="text-xs text-slate-500 mt-0.5">Clasificado por la DGI como gran contribuyente</p>
                </div>
              </label>
            </div>

            {/* Contacto */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">3</div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Información de contacto</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Correo de la empresa</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputCls}
                    placeholder="info@empresa.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className={inputCls}
                    placeholder="507-123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Representante legal</label>
                  <input
                    type="text"
                    value={form.representanteLegal}
                    onChange={(e) => setForm({ ...form, representanteLegal: e.target.value })}
                    className={inputCls}
                    placeholder="Nombre del representante"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Dirección</label>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    className={inputCls}
                    placeholder="Ciudad de Panamá"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-blue-200"
            >
              {cargando ? 'Registrando empresa...' : 'Registrar empresa y continuar →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
