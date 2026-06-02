const prisma = require('../utils/prisma');
const calendarioSvc = require('../services/calendario.service');
const alertaSvc = require('../services/alerta.service');

async function obtener(req, res, next) {
  try {
    const { empresaId } = req.params;
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes  = hoy.getMonth() + 1;

    // Ejecutar todas las queries en paralelo
    const [
      empresa,
      obligacionesMes,
      obligacionesVencidas,
      itbmsMes,
      itbmsAnual,
      isrAnio,
      anticiposAnio,
      alertasCriticas,
      totalNoLeidas,
      proximosVencimientos,
    ] = await Promise.all([
      // Empresa
      prisma.empresa.findUnique({ where: { id: empresaId } }),

      // Obligaciones que vencen este mes
      prisma.obligacionFiscal.findMany({
        where: {
          empresaId,
          proximoVencimiento: {
            gte: new Date(anio, mes - 1, 1),
            lt:  new Date(anio, mes, 1),
          },
          estado: { in: ['PENDIENTE', 'VENCIDA'] },
        },
        orderBy: { proximoVencimiento: 'asc' },
      }),

      // Obligaciones vencidas sin pagar
      prisma.obligacionFiscal.findMany({
        where: {
          empresaId,
          estado: 'VENCIDA',
        },
        orderBy: { proximoVencimiento: 'asc' },
        take: 5,
      }),

      // ITBMS del mes actual
      prisma.declaracionITBMS.findUnique({
        where: {
          empresaId_periodo: {
            empresaId,
            periodo: `${anio}-${String(mes).padStart(2, '0')}`,
          },
        },
      }),

      // ITBMS del año completo
      prisma.declaracionITBMS.findMany({
        where: { empresaId, anio },
        orderBy: { mes: 'asc' },
      }),

      // ISR del año
      prisma.declaracionISR.findUnique({
        where: { empresaId_anio: { empresaId, anio } },
      }),

      // Anticipos del año
      prisma.anticipo.findMany({
        where: { empresaId, anio },
        orderBy: { cuota: 'asc' },
      }),

      // Alertas críticas sin leer
      prisma.alertaFiscal.findMany({
        where: { empresaId, leida: false, activa: true, prioridad: 4 },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Total no leídas
      alertaSvc.contarAlertasNoLeidas(empresaId),

      // Próximos 30 días
      calendarioSvc.obtenerProximosVencimientos(empresaId, 30),
    ]);

    // ── Posición ITBMS del año ────────────────────────────────────────────────
    const itbmsResumen = itbmsAnual.reduce(
      (acc, d) => ({
        totalVentas:      acc.totalVentas      + Number(d.totalVentas),
        totalDebito:      acc.totalDebito      + Number(d.itbmsDebito),
        totalCredito:     acc.totalCredito     + (Number(d.itbmsCredito) + Number(d.creditoMesAnterior)),
        impuestoPagado:   acc.impuestoPagado   + (d.estado === 'PAGADA'     ? Number(d.saldo)       : 0),
        impuestePendiente:acc.impuestePendiente + (d.estado === 'PRESENTADA' ? Number(d.saldo)       : 0),
        declaradas:       acc.declaradas       + (d.estado !== 'BORRADOR'   ? 1                    : 0),
        saldoAFavor:      acc.saldoAFavor      + Number(d.saldoAFavor),
      }),
      { totalVentas: 0, totalDebito: 0, totalCredito: 0, impuestoPagado: 0, impuestePendiente: 0, declaradas: 0, saldoAFavor: 0 }
    );

    // ── Posición anticipos ISR ────────────────────────────────────────────────
    const anticipoResumen = {
      total:    anticiposAnio.reduce((s, a) => s + Number(a.monto), 0),
      pagado:   anticiposAnio.filter((a) => a.estado === 'PAGADA').reduce((s, a) => s + Number(a.monto), 0),
      pendiente:anticiposAnio.filter((a) => a.estado !== 'PAGADA').reduce((s, a) => s + Number(a.monto), 0),
      cuotasPagadas: anticiposAnio.filter((a) => a.estado === 'PAGADA').length,
    };

    // ── Próximos vencimientos con urgencia ───────────────────────────────────
    const proximosConUrgencia = proximosVencimientos.slice(0, 8).map((obl) => {
      const vence = new Date(obl.proximoVencimiento);
      const dias  = Math.round((vence - hoy) / (1000 * 60 * 60 * 24));
      return {
        ...obl,
        diasRestantes: dias,
        urgencia: dias <= 1 ? 'CRITICA' : dias <= 7 ? 'ALTA' : dias <= 15 ? 'MEDIA' : 'NORMAL',
      };
    });

    // ── Ventas mensuales para el gráfico ─────────────────────────────────────
    const ventasMensuales = Array.from({ length: 12 }, (_, i) => {
      const m     = i + 1;
      const decl  = itbmsAnual.find((d) => d.mes === m);
      return {
        mes: m,
        label: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i],
        ventas:     decl ? Number(decl.totalVentas)  : null,
        itbms:      decl ? Number(decl.itbmsDebito)  : null,
        declarado:  !!decl,
        estado:     decl?.estado || null,
      };
    });

    // ── Indicador de salud fiscal ─────────────────────────────────────────────
    const vencidasCount = obligacionesVencidas.length;
    let saludFiscal = 'VERDE';
    if (vencidasCount > 0 || alertasCriticas.length > 0) saludFiscal = 'ROJO';
    else if (proximosConUrgencia.some((p) => p.urgencia === 'ALTA')) saludFiscal = 'AMARILLO';

    res.json({
      empresa,
      anio,
      mes,
      saludFiscal,
      itbmsMes: itbmsMes || null,
      itbmsResumen,
      ventasMensuales,
      isrAnio: isrAnio || null,
      anticipoResumen,
      anticiposAnio,
      obligacionesMes,
      obligacionesVencidas,
      proximosVencimientos: proximosConUrgencia,
      alertasCriticas,
      totalNoLeidas,
      mesesDeclarados: itbmsAnual.length,
    });
  } catch (err) { next(err); }
}

module.exports = { obtener };
