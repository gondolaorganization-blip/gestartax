const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

const CUOTA_FECHAS = {
  PRIMERA: { mes: 3,  dia: 31, nombre: '1ra cuota — Marzo'      },
  SEGUNDA: { mes: 6,  dia: 30, nombre: '2da cuota — Junio'       },
  TERCERA: { mes: 9,  dia: 30, nombre: '3ra cuota — Septiembre'  },
};

// Genera los 3 anticipos del año basados en el ISR del año anterior
async function generarAnticipos(req, res, next) {
  try {
    const { empresaId } = req.params;
    const anio = parseInt(req.body.anio) || new Date().getFullYear();

    // Buscar ISR del año anterior para calcular el monto
    const isrAnterior = await prisma.declaracionISR.findUnique({
      where: { empresaId_anio: { empresaId, anio: anio - 1 } },
    });

    // Si no hay ISR anterior, usar el monto manual
    const montoBase = isrAnterior
      ? Number(isrAnterior.impuestoCausado)
      : Number(req.body.montoBase || 0);

    if (montoBase <= 0) {
      return res.status(400).json({
        error: 'No se encontró ISR del año anterior. Ingresá el monto base manualmente.',
      });
    }

    const montoPorCuota = Math.round((montoBase / 3) * 100) / 100;
    const creados = [];

    for (const [cuota, info] of Object.entries(CUOTA_FECHAS)) {
      const existe = await prisma.anticipo.findUnique({
        where: { empresaId_anio_cuota: { empresaId, anio, cuota } },
      });

      if (!existe) {
        const fechaVence = new Date(anio, info.mes - 1, info.dia);
        const nuevo = await prisma.anticipo.create({
          data: {
            empresaId,
            anio,
            cuota,
            monto: montoPorCuota,
            fechaVence,
            estado: new Date() > fechaVence ? 'VENCIDA' : 'PENDIENTE',
          },
        });
        creados.push(nuevo);
      }
    }

    // Actualizar obligaciones fiscales de tipo ANTICIPO_ISR
    for (const [cuota, info] of Object.entries(CUOTA_FECHAS)) {
      const ref = `${anio}-anticipo-${cuota.toLowerCase()}`;
      await prisma.obligacionFiscal.updateMany({
        where: { empresaId, tipo: 'ANTICIPO_ISR', periodoReferencia: ref },
        data: { montoEstimado: montoPorCuota },
      });
    }

    res.status(201).json({
      mensaje: `${creados.length} anticipo(s) generados para ${anio}`,
      montoPorCuota,
      montoBaseISR: montoBase,
      fuente: isrAnterior ? `ISR ${anio - 1}` : 'Manual',
      anticipos: creados,
    });
  } catch (err) { next(err); }
}

async function listar(req, res, next) {
  try {
    const { empresaId } = req.params;
    const anio = req.query.anio ? parseInt(req.query.anio) : undefined;

    const anticipos = await prisma.anticipo.findMany({
      where: { empresaId, ...(anio ? { anio } : {}) },
      orderBy: [{ anio: 'desc' }, { cuota: 'asc' }],
      include: {
        pagos: { orderBy: { fecha: 'desc' }, take: 1 },
      },
    });

    const hoy = new Date();
    const enriquecidos = anticipos.map((a) => {
      const vence = new Date(a.fechaVence);
      const diasRestantes = Math.round((vence - hoy) / (1000 * 60 * 60 * 24));
      return { ...a, diasRestantes };
    });

    res.json(enriquecidos);
  } catch (err) { next(err); }
}

async function resumenAnual(req, res, next) {
  try {
    const { empresaId } = req.params;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();

    const anticipos = await prisma.anticipo.findMany({
      where: { empresaId, anio },
      orderBy: { cuota: 'asc' },
      include: { pagos: true },
    });

    const totalMonto    = anticipos.reduce((s, a) => s + Number(a.monto), 0);
    const totalPagado   = anticipos.filter((a) => a.estado === 'PAGADA').reduce((s, a) => s + Number(a.monto), 0);
    const totalPendiente = totalMonto - totalPagado;

    const isrAnio = await prisma.declaracionISR.findUnique({
      where: { empresaId_anio: { empresaId, anio } },
    });

    res.json({
      anio,
      anticipos,
      resumen: {
        totalMonto:    Math.round(totalMonto    * 100) / 100,
        totalPagado:   Math.round(totalPagado   * 100) / 100,
        totalPendiente: Math.round(totalPendiente * 100) / 100,
        cuotasPagadas: anticipos.filter((a) => a.estado === 'PAGADA').length,
        cuotasTotales: anticipos.length,
      },
      isrVinculado: isrAnio,
    });
  } catch (err) { next(err); }
}

async function registrarPago(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const { empresaId, anticipoId } = req.params;

    const anticipo = await prisma.anticipo.findUnique({ where: { id: anticipoId } });
    if (!anticipo || anticipo.empresaId !== empresaId) {
      return res.status(404).json({ error: 'Anticipo no encontrado' });
    }

    const pago = await prisma.pagoImpuesto.create({
      data: {
        anticipoId,
        monto:           req.body.monto || anticipo.monto,
        fecha:           req.body.fecha ? new Date(req.body.fecha) : new Date(),
        referenciaBanco: req.body.referenciaBanco,
        banco:           req.body.banco,
        comprobante:     req.body.comprobante,
        observaciones:   req.body.observaciones,
      },
    });

    await prisma.anticipo.update({
      where: { id: anticipoId },
      data: { estado: 'PAGADA', fechaPago: pago.fecha },
    });

    // Marcar obligación fiscal como pagada
    const ref = `${anticipo.anio}-anticipo-${anticipo.cuota.toLowerCase()}`;
    await prisma.obligacionFiscal.updateMany({
      where: { empresaId, tipo: 'ANTICIPO_ISR', periodoReferencia: ref },
      data: { estado: 'PAGADA' },
    });

    res.status(201).json({ pago, anticipo: { id: anticipoId, estado: 'PAGADA' } });
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const { empresaId, anticipoId } = req.params;
    const anticipo = await prisma.anticipo.findUnique({ where: { id: anticipoId } });
    if (!anticipo || anticipo.empresaId !== empresaId) {
      return res.status(404).json({ error: 'Anticipo no encontrado' });
    }

    const actualizado = await prisma.anticipo.update({
      where: { id: anticipoId },
      data: {
        monto:  req.body.monto  ?? anticipo.monto,
        estado: req.body.estado ?? anticipo.estado,
      },
    });
    res.json(actualizado);
  } catch (err) { next(err); }
}

module.exports = { generarAnticipos, listar, resumenAnual, registrarPago, actualizar };
