import { useQuery } from '@tanstack/react-query';
import { alertasApi } from '../api/alertas.api';
import { useAuthStore } from '../store/auth.store';

export function useAlertasCount(empresaId) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['alertas-conteo', empresaId],
    queryFn: () => alertasApi.conteo(empresaId).then((r) => r.data),
    enabled: !!empresaId && isAuthenticated,
    refetchInterval: 5 * 60 * 1000, // Refresca cada 5 minutos
    staleTime: 2 * 60 * 1000,
  });
}
