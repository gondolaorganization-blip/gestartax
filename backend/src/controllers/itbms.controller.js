const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// ─── Cálculo fiscal ITBMS ─────────────────────────────────────────────────────

function calcularITBMS(datos) {
  const {
    ventasGravadas7 = 0,
    ventasGravadas10 = 0,
    ventasGravadas15 = 0,
    ventasExentas = 0,
    ventasNoSujetas = 0,
    itbmsCredito = 0,
    creditoMesAnterior = 0,
  } = datos;

  const v7  = Number(ventasGravadas7);
  const v10 = Number(ventasGravadas10);
  const v15 = Number(ventasGravadas15);

  const debito7  = Math.round(v7  * 0.07 * 100) / 100;
  const debito10 = Math.round(v10 * 0.10 * 100) / 100;
  const debito15 = Math.round(v15 * 0.15 * 100) / 100;
  const debitoTotal = Math.round((debito7 + debito10 + debito15) * 100) / 100;

  const totalCredito = Math.round((Number(itbmsCredito) + Number(creditoMesAnterior)) * 100) / 100;
  const totalVentas  = Math.round((v7 + v10 + v15 + Number(ventasExentas) + Number(ventasNoSujetas)) * 100) / 100;

  const saldo = Math.round((debitoTotal - totalCredito) * 100) / 100;
  const saldoAFavor = saldo < 0 ? Math.abs(saldo) : 0;
  const impuestoAPagar = saldo > 0 ? saldo : 0;

  return {
    itbmsDebito7: debito7,
    itbmsDebito10: debito10,
    itbmsDebito15: debito15,
    itbmsDebito: debitoTotal,
    totalVentas,
    saldo: impuestoAPagar,
    saldoAFavor,
  };
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

async function listar(req, res, next) {
  try {
    const { empresaId } = req.params;
    const { anio } = req.query;

    const where = { empresaId };
    if (anio) where.anio = parseInt(anio);

    const declaraciones = await prisma.declaracionITBMS.findMany({
      where,
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    });
    res.json(declaraciones);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const decl = await prisma.declaracionITBMS.findUnique({
      where: { id: req.params.id },
    });
    if (!decl || decl.empresaId !== req.params.empresaId) {
      return res.status(404).json({ error: 'Declaración no encontrada' });
    }
    res.json(decl);
  } catch (err) {
    next(err);
  }
}

async function obtenerPorPeriodo(req, res, next) {
  try {
    const { empresaId } = req.params;
    const { periodo } = req.params; // "2025-03"

    const decl = await prisma.declaracionITBMS.findUnique({
      where: { empresaId_periodo: { empresaId, periodo } },
    });
    if (!decl) return res.status(404).json({ error: 'Declaración no encontrada' });
    res.json(decl);
  } catch (err) {
    next(err);
  }
}

async function calcularPreview(req, res, next) {
  try {
    const resultado = calcularITBMS(req.body);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const { empresaId } = req.params;
    const { mes, anio } = req.body;

    const periodo = `${anio}-${String(mes).padStart(2, '0')}`;

    const existe = await prisma.declaracionITBMS.findUnique({
      where: { empresaId_periodo: { empresaId, periodo } },
    });
    if (existe) return res.status(409).json({ error: `Ya existe declaración para el período ${periodo}` });

    // Tomar saldo a favor del mes anterior automáticamente
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const anioAnterior = mes === 1 ? anio - 1 : anio;
    const periodoAnterior = `${anioAnterior}-${String(mesAnterior).padStart(2, '0')}`;

    const declAnterior = await prisma.declaracionITBMS.findUnique({
      where: { empresaId_periodo: { empresaId, periodo: periodoAnterior } },
    });

    const creditoMesAnterior = declAnterior?.saldoAFavor || 0;

    const calculado = calcularITBMS({ ...req.body, creditoMesAnterior });

    // Fecha de vencimiento: día 15 del mes siguiente
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    const diaLimite = empresa?.esGranContribuyente ? 10 : 15;
    const mesVence = mes === 12 ? 1 : mes + 1;
    const anioVence = mes === 12 ? anio + 1 : anio;
    const fechaVencimiento = new Date(anioVence, mesVence - 1, diaLimite);

    const decl = await prisma.declaracionITBMS.create({
      data: {
        empresaId,
        periodo,
        mes,
        anio,
        fechaVencimiento,
        ventasGravadas7:  req.body.ventasGravadas7  || 0,
        ventasGravadas10: req.body.ventasGravadas10 || 0,
        ventasGravadas15: req.body.ventasGravadas15 || 0,
        ventasExentas:    req.body.ventasExentas    || 0,
        ventasNoSujetas:  req.body.ventasNoSujetas  || 0,
        itbmsCredito:     req.body.itbmsCredito     || 0,
        creditoMesAnterior,
        observaciones:    req.body.observaciones,
        ...calculado,
      },
    });

    // Actualizar la obligación fiscal correspondiente
    await prisma.obligacionFiscal.updateMany({
      where: { empresaId, tipo: 'ITBMS', periodoReferencia: periodo },
      data: { estado: 'PRESENTADA', montoEstimado: calculado.saldo },
    });

    res.status(201).json(decl);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const { empresaId, id } = req.params;

    const decl = await prisma.declaracionITBMS.findUnique({ where: { id } });
    if (!decl || decl.empresaId !== empresaId) {
      return res.status(404).json({ error: 'Declaración no encontrada' });
    }
    if (decl.estado === 'PAGADA') {
      return res.status(400).json({ error: 'No se puede modificar una declaración pagada' });
    }

    const creditoMesAnterior = req.body.creditoMesAnterior ?? decl.creditoMesAnterior;
    const calculado = calcularITBMS({ ...req.body, creditoMesAnterior });

    const actualizada = await prisma.declaracionITBMS.update({
      where: { id },
      data: {
        ventasGravadas7:  req.body.ventasGravadas7  ?? decl.ventasGravadas7,
        ventasGravadas10: req.body.ventasGravadas10 ?? decl.ventasGravadas10,
        ventasGravadas15: req.body.ventasGravadas15 ?? decl.ventasGravadas15,
        ventasExentas:    req.body.ventasExentas    ?? decl.ventasExentas,
        ventasNoSujetas:  req.body.ventasNoSujetas  ?? decl.ventasNoSujetas,
        itbmsCredito:     req.body.itbmsCredito     ?? decl.itbmsCredito,
        creditoMesAnterior,
        observaciones:    req.body.observaciones    ?? decl.observaciones,
        estado:           req.body.estado           ?? decl.estado,
        fechaPresentacion: req.body.estado === 'PRESENTADA' ? new Date() : decl.fechaPresentacion,
        ...calculado,
      },
    });

    // Sincronizar estado en ObligacionFiscal
    if (req.body.estado) {
      await prisma.obligacionFiscal.updateMany({
        where: { empresaId, tipo: 'ITBMS', periodoReferencia: decl.periodo },
        data: { estado: req.body.estado, montoEstimado: calculado.saldo },
      });
    }

    res.json(actualizada);
  } catch (err) {
    next(err);
  }
}

async function resumenAnual(req, res, next) {
  try {
    const { empresaId } = req.params;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();

    const declaraciones = await prisma.declaracionITBMS.findMany({
      where: { empresaId, anio },
      orderBy: { mes: 'asc' },
    });

    const totales = declaraciones.reduce(
      (acc, d) => ({
        totalVentas:      acc.totalVentas      + Number(d.totalVentas),
        ventasGravadas7:  acc.ventasGravadas7  + Number(d.ventasGravadas7),
        ventasGravadas10: acc.ventasGravadas10 + Number(d.ventasGravadas10),
        ventasGravadas15: acc.ventasGravadas15 + Number(d.ventasGravadas15),
        ventasExentas:    acc.ventasExentas    + Number(d.ventasExentas),
        itbmsDebito:      acc.itbmsDebito      + Number(d.itbmsDebito),
        itbmsCredito:     acc.itbmsCredito     + Number(d.itbmsCredito),
        impuestoPagado:   acc.impuestoPagado   + (d.estado === 'PAGADA' ? Number(d.saldo) : 0),
        impuestePendiente: acc.impuestePendiente + (d.estado !== 'PAGADA' && Number(d.saldo) > 0 ? Number(d.saldo) : 0),
      }),
      {
        totalVentas: 0, ventasGravadas7: 0, ventasGravadas10: 0,
        ventasGravadas15: 0, ventasExentas: 0, itbmsDebito: 0,
        itbmsCredito: 0, impuestoPagado: 0, impuestePendiente: 0,
      }
    );

    res.json({ anio, declaraciones, totales });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  obtener,
  obtenerPorPeriodo,
  calcularPreview,
  crear,
  actualizar,
  resumenAnual,
};
