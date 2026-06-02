const prisma = require('../utils/prisma');

const UMBRALES_DIAS = [30, 15, 7, 1];

// Genera alertas de vencimiento para todas las obligaciones pendientes de una empresa
async function generarAlertasVencimiento(empresaId) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const obligaciones = await prisma.obligacionFiscal.findMany({
    where: { empresaId, estado: { in: ['PENDIENTE', 'VENCIDA'] } },
    orderBy: { proximoVencimiento: 'asc' },
  });

  const alertasCreadas = [];

  for (const obl of obligaciones) {
    const vence = new Date(obl.proximoVencimiento);
    vence.setHours(0, 0, 0, 0);
    const diasRestantes = Math.round((vence - hoy) / (1000 * 60 * 60 * 24));

    // Alertas por umbral de días
    for (const umbral of UMBRALES_DIAS) {
      if (diasRestantes === umbral) {
        const yaExiste = await prisma.alertaFiscal.findFirst({
          where: {
            empresaId,
            tipo: 'VENCIMIENTO',
            mensaje: { contains: obl.descripcion },
            diasRestantes: umbral,
            createdAt: { gte: new Date(hoy) },
          },
        });
        if (!yaExiste) {
          const alerta = await prisma.alertaFiscal.create({
            data: {
              empresaId,
              tipo: 'VENCIMIENTO',
              mensaje: `Vence en ${umbral} día${umbral !== 1 ? 's' : ''}: ${obl.descripcion}`,
              detalle: `Período: ${obl.periodoReferencia || 'N/A'} — Vencimiento: ${vence.toLocaleDateString('es-PA')}`,
              fechaVence: obl.proximoVencimiento,
              diasRestantes: umbral,
              prioridad: umbral <= 1 ? 4 : umbral <= 7 ? 3 : umbral <= 15 ? 2 : 1,
            },
          });
          alertasCreadas.push(alerta);
        }
      }
    }

    // Alerta de obligación vencida
    if (diasRestantes < 0 && obl.estado === 'VENCIDA') {
      const yaExiste = await prisma.alertaFiscal.findFirst({
        where: {
          empresaId,
          tipo: 'VENCIMIENTO',
          mensaje: { contains: `VENCIDA: ${obl.descripcion}` },
          createdAt: { gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1) },
        },
      });
      if (!yaExiste) {
        const alerta = await prisma.alertaFiscal.create({
          data: {
            empresaId,
            tipo: 'VENCIMIENTO',
            mensaje: `VENCIDA: ${obl.descripcion}`,
            detalle: `Venció hace ${Math.abs(diasRestantes)} días — ${vence.toLocaleDateString('es-PA')}`,
            fechaVence: obl.proximoVencimiento,
            diasRestantes,
            prioridad: 4,
          },
        });
        alertasCreadas.push(alerta);
      }
    }
  }

  return alertasCreadas;
}

async function marcarAlertaLeida(alertaId, empresaId) {
  return prisma.alertaFiscal.updateMany({
    where: { id: alertaId, empresaId },
    data: { leida: true },
  });
}

async function marcarTodasLeidas(empresaId) {
  return prisma.alertaFiscal.updateMany({
    where: { empresaId, leida: false },
    data: { leida: true },
  });
}

async function obtenerAlertas(empresaId, { soloNoLeidas = false, limite = 50 } = {}) {
  return prisma.alertaFiscal.findMany({
    where: {
      empresaId,
      activa: true,
      ...(soloNoLeidas ? { leida: false } : {}),
    },
    orderBy: [{ prioridad: 'desc' }, { createdAt: 'desc' }],
    take: limite,
  });
}

async function contarAlertasNoLeidas(empresaId) {
  return prisma.alertaFiscal.count({
    where: { empresaId, leida: false, activa: true },
  });
}

module.exports = {
  generarAlertasVencimiento,
  marcarAlertaLeida,
  marcarTodasLeidas,
  obtenerAlertas,
  contarAlertasNoLeidas,
};
