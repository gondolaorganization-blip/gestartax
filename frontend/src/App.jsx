import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import RutaProtegida from './components/RutaProtegida';
import AppLayout from './components/AppLayout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import NuevaEmpresa from './pages/NuevaEmpresa';
import Dashboard from './pages/Dashboard';
import Calendario from './pages/Calendario';
import ITBMS from './pages/ITBMS';
import ISR from './pages/ISR';
import Anticipos from './pages/Anticipos';
import CSS from './pages/CSS';
import AvisoOperacion from './pages/AvisoOperacion';
import Inmuebles from './pages/Inmuebles';
import Historial from './pages/Historial';
import Alertas from './pages/Alertas';
import Reportes from './pages/Reportes';
import TasaUnica from './pages/TasaUnica';
import Dividendos from './pages/Dividendos';
import Municipales from './pages/Municipales';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5 * 60 * 1000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rutas protegidas sin empresa */}
          <Route
            path="/empresas/nueva"
            element={
              <RutaProtegida>
                <NuevaEmpresa />
              </RutaProtegida>
            }
          />

          {/* Rutas protegidas con empresa */}
          <Route
            path="/empresa/:empresaId"
            element={
              <RutaProtegida>
                <AppLayout />
              </RutaProtegida>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="itbms" element={<ITBMS />} />
            <Route path="isr" element={<ISR />} />
            <Route path="anticipos" element={<Anticipos />} />
            <Route path="css" element={<CSS />} />
            <Route path="aviso-operacion" element={<AvisoOperacion />} />
            <Route path="inmuebles" element={<Inmuebles />} />
            <Route path="historial" element={<Historial />} />
            <Route path="alertas" element={<Alertas />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="tasa-unica" element={<TasaUnica />} />
            <Route path="dividendos" element={<Dividendos />} />
            <Route path="municipales" element={<Municipales />} />
          </Route>

          {/* Raíz — landing pública */}
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
