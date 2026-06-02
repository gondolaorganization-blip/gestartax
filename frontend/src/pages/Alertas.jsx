import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertasApi } from '../api/alertas.api';
import { formatFecha } from '../utils/format';
import {
  Bell, AlertTriangle, Info, CheckCircle, Clock,
  Archive, Check, Plus, X, Filter,
} from 'lucide-react';

// ─── Configuración visual por prioridad y tipo ────────────────────────────────

const PRIORIDAD = {
  4: { label: 'Crítica',  bg: 'bg-red-50    border-red-300',    dot: 'bg-red-500',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700'    },
  3: { label: 'Alta',     bg: 'bg-orange-50 border-orange-300', dot: 'bg-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  2: { label: 'Media',    bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-400', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
  1: { label: 'Normal',   bg: 'bg-slate-50  border-slate-200',  dot: 'bg-slate-400',  text: 'text-slate-600',  badge: 'bg-slate-100 text-slate-600'   },
};

const TIPO_CONFIG = {
  VENCIMIENTO:       { Icon: Clock,          label: 'Vencimiento'       },
  CAMBIO_NORMATIVO:  { Icon: Info,           label: 'Cambio normativo'  },
  NUEVA_RESOLUCION:  { Icon: Info,           label: 'Nueva resolución'  },
  SALDO_FAVOR:       { Icon: CheckCircle,    label: 'Saldo a favor'     },
  RECORDATORIO:      { Icon: Bell,           label: 'Recordatorio'      },
};

const FILTROS = [
  { key: null,              label: 'Todas'       },
  { key: 'VENCIMIENTO',     label: 'Vencimientos'},
  { key: 'RECORDATORIO',    label: 'Recordatorios'},
  { key: 'CAMBIO_NORMATIVO',label: 'Normativos'  },
];

// ─── Modal nueva alerta manual ────────────────────────────────────────────────

function ModalNuevaAlerta({ empresaId, onCerrar }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    tipo: 'RECORDATORIO',
    mensaje: '',
    detalle: '',
    fechaVence: '',
    prioridad: 2,
  });
  const [error, setError] = useState('');

  const crearMut = useMutation({
    mutationFn: () => alertasApi.crearManual(empresaId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alertas', empresaId] });
      qc.invalidateQueries({ queryKey: ['alertas-conteo', empresaId] });
      onCerrar();
    },
    onError: (e) => setError(e.response?.data?.error || 'Error al crear alerta'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Nueva alerta</h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="RECORDATORIO">Recordatorio</option>
                <option value="CAMBIO_NORMATIVO">Cambio normativo</option>
                <option value="NUEVA_RESOLUCION">Nueva resolución DGI</option>
                <option value="VENCIMIENTO">Vencimiento</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
              <select
                value={form.prioridad}
                onChange={(e) => setForm({ ...form, prioridad: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Normal</option>
                <option value={2}>Media</option>
                <option value={3}>Alta</option>
                <option value={4}>Crítica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mensaje *</label>
            <input
              type="text"
              value={form.mensaje}
              onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descripción breve de la alerta"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Detalle</label>
            <textarea
              value={form.detalle}
              onChange={(e) => setForm({ ...form, detalle: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Información adicional, resolución, artículo del código..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de vencimiento</label>
            <input
              type="date"
              value={form.fechaVence}
              onChange={(e) => setForm({ ...form, fechaVence: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onCerrar} className="flex-1 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={() => crearMut.mutate()}
            disabled={!form.mensaje || crearMut.isPending}
            className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60"
          >
            {crearMut.isPending ? 'Creando...' : 'Crear alerta'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de alerta ────────────────────────────────────────────────────────

function TarjetaAlerta({ alerta, empresaId }) {
  const qc = useQueryClient();
  const p = PRIORIDAD[alerta.prioridad] || PRIORIDAD[1];
  const { Icon } = TIPO_CONFIG[alerta.tipo] || TIPO_CONFIG.RECORDATORIO;

  const leerMut = useMutation({
    mutationFn: () => alertasApi.marcarLeida(empresaId, alerta.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alertas', empresaId] });
      qc.invalidateQueries({ queryKey: ['alertas-conteo', empresaId] });
    },
  });

  const archivarMut = useMutation({
    mutationFn: () => alertasApi.archivar(empresaId, alerta.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alertas', empresaId] });
      qc.invalidateQueries({ queryKey: ['alertas-conteo', empresaId] });
    },
  });

  return (
    <div className={`flex gap-3 p-4 rounded-xl border transition-all ${p.bg} ${alerta.leida ? 'opacity-60' : ''}`}>
      {/* Dot de no leída */}
      <div className="shrink-0 flex flex-col items-center gap-2 pt-0.5">
        {!alerta.leida && <div className={`w-2 h-2 rounded-full ${p.dot}`} />}
        {alerta.leida && <div className="w-2 h-2" />}
        <Icon size={14} className={`${p.text} mt-1`} />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${p.badge}`}>
                {p.label}
              </span>
              <span className="text-xs text-slate-500">
                {TIPO_CONFIG[alerta.tipo]?.label || alerta.tipo}
              </span>
              {alerta.diasRestantes !== null && alerta.diasRestantes !== undefined && (
                <span className={`text-xs font-medium ${
                  alerta.diasRestantes <= 0 ? 'text-red-600' :
                  alerta.diasRestantes <= 7 ? 'text-red-500' :
                  alerta.diasRestantes <= 15 ? 'text-orange-500' : 'text-slate-400'
                }`}>
                  {alerta.diasRestantes <= 0 ? 'Vencida' :
                   alerta.diasRestantes === 1 ? '1 día' :
                   `${alerta.diasRestantes} días`}
                </span>
              )}
            </div>
            <p className={`text-sm font-medium leading-snug ${alerta.leida ? 'text-slate-600' : 'text-slate-900'}`}>
              {alerta.mensaje}
            </p>
            {alerta.detalle && (
              <p className="text-xs text-slate-500 mt-1">{alerta.detalle}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
              <span>{formatFecha(alerta.createdAt)}</span>
              {alerta.fechaVence && (
                <span>Vence: {formatFecha(alerta.fechaVence)}</span>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1 shrink-0">
            {!alerta.leida && (
              <button
                onClick={() => leerMut.mutate()}
                disabled={leerMut.isPending}
                className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 hover:text-slate-700 transition-colors"
                title="Marcar como leída"
              >
                <Check size={14} />
              </button>
            )}
            <button
              onClick={() => archivarMut.mutate()}
              disabled={archivarMut.isPending}
              className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 hover:text-slate-700 transition-colors"
              title="Archivar"
            >
              <Archive size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal Alertas ─────────────────────────────────────────────────

export default function Alertas() {
  const { empresaId } = useParams();
  const qc = useQueryClient();
  const [filtroTipo, setFiltroTipo] = useState(null);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [modalNueva, setModalNueva] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['alertas', empresaId, filtroTipo, soloNoLeidas],
    queryFn: () => alertasApi.listar(empresaId, {
      tipo: filtroTipo || undefined,
      noLeidas: soloNoLeidas,
    }).then((r) => r.data),
    enabled: !!empresaId,
  });

  const marcarTodasMut = useMutation({
    mutationFn: () => alertasApi.marcarTodasLeidas(empresaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alertas', empresaId] });
      qc.invalidateQueries({ queryKey: ['alertas-conteo', empresaId] });
    },
  });

  const alertas       = data?.alertas       || [];
  const totalNoLeidas = data?.totalNoLeidas  || 0;
  const criticas      = data?.criticas       || 0;

  // Agrupar por fecha relativa
  const hoy   = new Date(); hoy.setHours(0, 0, 0, 0);
  const ayer  = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const semana = new Date(hoy); semana.setDate(hoy.getDate() - 7);

  function grupoFecha(alerta) {
    const d = new Date(alerta.createdAt); d.setHours(0, 0, 0, 0);
    if (d >= hoy)   return 'Hoy';
    if (d >= ayer)  return 'Ayer';
    if (d >= semana) return 'Esta semana';
    return 'Anteriores';
  }

  const grupos = alertas.reduce((acc, a) => {
    const g = grupoFecha(a);
    if (!acc[g]) acc[g] = [];
    acc[g].push(a);
    return acc;
  }, {});

  const ordenGrupos = ['Hoy', 'Ayer', 'Esta semana', 'Anteriores'];

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alertas fiscales</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {totalNoLeidas > 0
              ? `${totalNoLeidas} alerta${totalNoLeidas !== 1 ? 's' : ''} sin leer`
              : 'Todo al día'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalNoLeidas > 0 && (
            <button
              onClick={() => marcarTodasMut.mutate()}
              disabled={marcarTodasMut.isPending}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Check size={14} />
              Marcar todas leídas
            </button>
          )}
          <button
            onClick={() => setModalNueva(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={14} />
            Nueva alerta
          </button>
        </div>
      </div>

      {/* Resumen de criticidad */}
      {(criticas > 0 || totalNoLeidas > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {criticas > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-900">{criticas} alerta{criticas !== 1 ? 's' : ''} crítica{criticas !== 1 ? 's' : ''}</p>
                <p className="text-xs text-red-600">Requieren atención inmediata</p>
              </div>
            </div>
          )}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-3">
            <Bell size={20} className="text-yellow-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-yellow-900">{totalNoLeidas} sin leer</p>
              <p className="text-xs text-yellow-600">Alertas pendientes de revisar</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {FILTROS.map((f) => (
          <button
            key={f.key ?? 'todas'}
            onClick={() => setFiltroTipo(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroTipo === f.key
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => setSoloNoLeidas(!soloNoLeidas)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              soloNoLeidas ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Filter size={13} />
            Sin leer
          </button>
        </div>
      </div>

      {/* Lista de alertas */}
      {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Cargando alertas...</div>}

      {!isLoading && alertas.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Sin alertas pendientes</p>
          <p className="text-slate-400 text-sm mt-1">
            {soloNoLeidas ? 'No hay alertas sin leer' : 'Todo al día con tus obligaciones fiscales'}
          </p>
        </div>
      )}

      {alertas.length > 0 && (
        <div className="space-y-6">
          {ordenGrupos.filter((g) => grupos[g]?.length > 0).map((grupo) => (
            <div key={grupo}>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{grupo}</h2>
              <div className="space-y-2">
                {grupos[grupo].map((alerta) => (
                  <TarjetaAlerta key={alerta.id} alerta={alerta} empresaId={empresaId} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalNueva && (
        <ModalNuevaAlerta empresaId={empresaId} onCerrar={() => setModalNueva(false)} />
      )}
    </div>
  );
}
