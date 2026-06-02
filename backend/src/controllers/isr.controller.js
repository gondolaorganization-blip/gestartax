const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// ─── Motor de cálculo ISR Panameño ────────────────────────────────────────────

const TASA_METODO_A  = 0.25;   // 25% sobre renta neta
const TASA_CAIR      = 0.0467; // 4.67% sobre ingresos brutos (CAIR)
const TASA_RETENCION = 0.10;   // 10% retenciones servicios profesionales extranjeros

function calcularISR(datos) {
  const ingresosBrutos       = Math.round(Number(datos.ingresosBrutos       || 0) * 100) / 100;
  const gastosDeducibles     = Math.round(Number(datos.gastosDeducibles     || 0) * 100) / 100;
  const anticiposPagados     = Math.round(Number(datos.anticiposPagados     || 0) * 100) / 100;
  const retencionesRecibidas = Math.round(Number(datos.retencionesRecibidas || 0) * 100) / 100;
  const otrosCreditos        = Math.round(Number(datos.otrosCreditos        || 0) * 100) / 100;

  // Renta neta (puede ser negativa → pérdida fiscal)
  const rentaNeta = Math.round((ingresosBrutos - gastosDeducibles) * 100) / 100;

  // Método A: 25% sobre renta neta (si es negativa, ISR = 0)
  const impuestoMetodoA = rentaNeta > 0
    ? Math.round(rentaNeta * TASA_METODO_A * 100) / 100
    : 0;

  // Método B CAIR: 4.67% sobre ingresos brutos
  const impuestoMetodoB = Math.round(ingresosBrutos * TASA_CAIR * 100) / 100;

  // Se paga el mayor (obligación del contribuyente)
  const impuestoCausado = Math.max(impuestoMetodoA, impuestoMetodoB);
  const metodoPagado    = impuestoMetodoA >= impuestoMetodoB ? 'A' : 'B';

  // Créditos totales aplicables
  const totalCreditos = Math.round((anticiposPagados + retencionesRecibidas + otrosCreditos) * 100) / 100;

  // Saldo: positivo = a pagar, negativo = saldo a favor
  const saldo = Math.round((impuestoCausado - totalCreditos) * 100) / 100;

  return {
    rentaNeta,
    impuestoMetodoA,
    impuestoMetodoB,
    impuestoCausado,
    metodoPagado,
    totalCreditos,
    saldo,
    comparacion: {
      diferenciaMetodos: Math.round(Math.abs(impuestoMetodoA - impuestoMetodoB) * 100) / 100,
      ahorroOptimizacion: impuestoMetodoA < impuestoMetodoB
        ? 0
        : Math.round((impuestoMetodoA - impuestoMetodoB) * 100) / 100,
      porcentajeEfectivo: ingresosBrutos > 0
        ? Math.round((impuestoCausado / ingresosBrutos) * 10000) / 100
        : 0,
    },
  };
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

async function listar(req, res, next) {
  try {
    const { empresaId } = req.params;
    const declaraciones = await prisma.declaracionISR.findMany({
      where: { empresaId },
      orderBy: { anio: 'desc' },
      include: {
        anticipos: { orderBy: { cuota: 'asc' } },
      },
    });
    res.json(declaraciones);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const { empresaId, id } = req.params;
    const decl = await prisma.declaracionISR.findUnique({
      where: { id },
      include: { anticipos: { orderBy: { cuota: 'asc' } } },
    });
    if (!decl || decl.empresaId !== empresaId) {
      return res.status(404).json({ error: 'Declaración no encontrada' });
    }
    res.json(decl);
  } catch (err) { next(err); }
}

async function calcularPreview(req, res, next) {
  try {
    const resultado = calcularISR(req.body);
    res.json(resultado);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const { empresaId } = req.params;
    const anio = parseInt(req.body.anio);

    const existe = await prisma.declaracionISR.findUnique({
      where: { empresaId_anio: { empresaId, anio } },
    });
    if (existe) return res.status(409).json({ error: `Ya existe declaración ISR para el año ${anio}` });

    // Tomar anticipos ya pagados de ese año
    const anticiposAnio = await prisma.anticipo.findMany({
      where: { empresaId, anio, estado: 'PAGADA' },
    });
    const totalAnticiposDB = anticiposAnio.reduce((s, a) => s + Number(a.monto), 0);

    const anticiposPagados = Number(req.body.anticiposPagados ?? totalAnticiposDB);

    const calculado = calcularISR({ ...req.body, anticiposPagados });

    // Fecha de vencimiento: 31 de marzo del año siguiente
    const fechaVencimiento = new Date(anio + 1, 2, 31);

    const decl = await prisma.declaracionISR.create({
      data: {
        empresaId,
        anio,
        fechaVencimiento,
        ingresosBrutos:       req.body.ingresosBrutos       || 0,
        gastosDeducibles:     req.body.gastosDeducibles     || 0,
        retencionesRecibidas: req.body.retencionesRecibidas || 0,
        otrosCreditos:        req.body.otrosCreditos        || 0,
        observaciones:        req.body.observaciones,
        anticiposPagados,
        rentaNeta:        calculado.rentaNeta,
        impuestoMetodoA:  calculado.impuestoMetodoA,
        impuestoMetodoB:  calculado.impuestoMetodoB,
        metodoPagado:     calculado.metodoPagado,
        impuestoCausado:  calculado.impuestoCausado,
        saldo:            calculado.saldo,
      },
    });

    // Vincular anticipos del año a esta declaración
    if (anticiposAnio.length > 0) {
      await prisma.anticipo.updateMany({
        where: { empresaId, anio },
        data: { declaracionISRId: decl.id },
      });
    }

    // Actualizar obligación fiscal ISR
    await prisma.obligacionFiscal.updateMany({
      where: { empresaId, tipo: 'ISR', periodoReferencia: `${anio}` },
      data: { estado: 'PRESENTADA', montoEstimado: calculado.saldo > 0 ? calculado.saldo : 0 },
    });

    res.status(201).json(decl);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const { empresaId, id } = req.params;
    const decl = await prisma.declaracionISR.findUnique({ where: { id } });
    if (!decl || decl.empresaId !== empresaId) {
      return res.status(404).json({ error: 'Declaración no encontrada' });
    }
    if (decl.estado === 'PAGADA') {
      return res.status(400).json({ error: 'No se puede modificar una declaración pagada' });
    }

    const anticiposPagados = req.body.anticiposPagados ?? Number(decl.anticiposPagados);
    const calculado = calcularISR({ ...req.body, anticiposPagados });

    const actualizada = await prisma.declaracionISR.update({
      where: { id },
      data: {
        ingresosBrutos:       req.body.ingresosBrutos       ?? decl.ingresosBrutos,
        gastosDeducibles:     req.body.gastosDeducibles     ?? decl.gastosDeducibles,
        retencionesRecibidas: req.body.retencionesRecibidas ?? decl.retencionesRecibidas,
        otrosCreditos:        req.body.otrosCreditos        ?? decl.otrosCreditos,
        observaciones:        req.body.observaciones        ?? decl.observaciones,
        estado:               req.body.estado               ?? decl.estado,
        fechaPresentacion:    req.body.estado === 'PRESENTADA' ? new Date() : decl.fechaPresentacion,
        anticiposPagados,
        rentaNeta:        calculado.rentaNeta,
        impuestoMetodoA:  calculado.impuestoMetodoA,
        impuestoMetodoB:  calculado.impuestoMetodoB,
        metodoPagado:     calculado.metodoPagado,
        impuestoCausado:  calculado.impuestoCausado,
        saldo:            calculado.saldo,
      },
    });

    if (req.body.estado) {
      await prisma.obligacionFiscal.updateMany({
        where: { empresaId, tipo: 'ISR', periodoReferencia: `${decl.anio}` },
        data: { estado: req.body.estado, montoEstimado: calculado.saldo > 0 ? calculado.saldo : 0 },
      });
    }

    res.json(actualizada);
  } catch (err) { next(err); }
}

async function proyeccionCierre(req, res, next) {
  try {
    const { empresaId } = req.params;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();
    const {
      ingresosBrutos, gastosDeducibles,
      anticiposPagados = 0, retencionesRecibidas = 0,
    } = req.query;

    if (!ingresosBrutos) {
      return res.status(400).json({ error: 'Se requiere ingresosBrutos para proyectar' });
    }

    const calculado = calcularISR({
      ingresosBrutos, gastosDeducibles: gastosDeducibles || 0,
      anticiposPagados, retencionesRecibidas,
    });

    // Anticipos calculados sobre el ISR proyectado (para el año siguiente)
    const montoPorCuota = Math.round((calculado.impuestoCausado / 3) * 100) / 100;

    res.json({
      anio,
      proyeccion: calculado,
      anticiposSiguienteAnio: {
        montoPorCuota,
        total: calculado.impuestoCausado,
        cuota1: { mes: 'Marzo',      monto: montoPorCuota },
        cuota2: { mes: 'Junio',      monto: montoPorCuota },
        cuota3: { mes: 'Septiembre', monto: montoPorCuota },
      },
    });
  } catch (err) { next(err); }
}

module.exports = {
  listar, obtener, calcularPreview,
  crear, actualizar, proyeccionCierre,
  calcularISR,
};
