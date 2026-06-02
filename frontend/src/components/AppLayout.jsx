import { Outlet, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuthStore } from '../store/auth.store';
import api from '../api/client';

export default function AppLayout() {
  const { empresaId } = useParams();
  const { setEmpresaActual, empresaActual } = useAuthStore();

  useEffect(() => {
    if (empresaId && empresaActual?.id !== empresaId) {
      api.get(`/empresas/${empresaId}`).then(({ data }) => setEmpresaActual(data)).catch(() => {});
    }
  }, [empresaId]);

  return (
    <div className="flex h-screen bg-slate-100/60">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
