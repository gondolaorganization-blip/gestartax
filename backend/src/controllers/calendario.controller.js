const calendarioSvc = require('../services/calendario.service');
const alertaSvc = require('../services/alerta.service');
const prisma = require('../utils/prisma');

async function generar(req, res, next) {
  try {
    const empresaId = req.params.empresaId;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();

    const resultado = await calendarioSvc.generarYGuardarCalendario(empresaId, anio);

    // Actualizar estados vencidos y generar alertas
    await calendarioSvc.actualizarEstadosVencidos(empresaId);
    const alertas = await alertaSvc.generarAlertasVencimiento(empresaId);

    res.json({
      mensaje: `Calendario ${anio} generado`,
      totalVencimientos: resultado.vencimientos.length,
      obligacionesNuevas: resultado.obligacionesCreadas,
      alertasGeneradas: alertas.length,
    });
  } catch (err) {
    next(err);
  }
}

async function obtenerAnual(req, res, next) {
  try {
    const empresaId = req.params.empresaId;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();

    let registros = await calendarioSvc.obtenerCalendarioAnual(empresaId, anio);

    // Si no existe el calendario aún, generarlo al vuelo
    if (registros.length === 0) {
      await calendarioSvc.generarYGuardarCalendario(empresaId, anio);
      await calendarioSvc.actualizarEstadosVencidos(empresaId);
      await alertaSvc.generarAlertasVencimiento(empresaId);
      registros = await calendarioSvc.obtenerCalendarioAnual(empresaId, anio);
    }

    // Enriquecer con estados actuales de las obligaciones
    const obligaciones = await prisma.obligacionFiscal.findMany({
      where: { empresaId },
      select: { periodoReferencia: true, tipo: true, estado: true, id: true },
    });
    const estadosMap = {};
    for (const o of obligaciones) {
      estadosMap[`${o.tipo}-${o.periodoReferencia}`] = o;
    }

    const calEnriquecido = registros.map((reg) => ({
      mes: reg.mes,
      anio: reg.anio,
      obligaciones: reg.obligaciones.map((obl) => ({
        ...obl,
        estado: estadosMap[`${obl.tipo}-${obl.periodoReferencia}`]?.estado || 'PENDIENTE',
        obligacionId: estadosMap[`${obl.tipo}-${obl.periodoReferencia}`]?.id || null,
      })),
    }));

    res.json(calEnriquecido);
  } catch (err) {
    next(err);
  }
}

async function obtenerMes(req, res, next) {
  try {
    const empresaId = req.params.empresaId;
    const mes = parseInt(req.params.mes);
    const anio = parseInt(req.query.anio) || new Date().getFullYear();

    const items = await calendarioSvc.obtenerCalendarioMes(empresaId, anio, mes);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function proximosVencimientos(req, res, next) {
  try {
    const empresaId = req.params.empresaId;
    const dias = parseInt(req.query.dias) || 30;

    // Actualizar estados vencidos primero
    await calendarioSvc.actualizarEstadosVencidos(empresaId);

    const proximos = await calendarioSvc.obtenerProximosVencimientos(empresaId, dias);
    const hoy = new Date();

    const enriquecidos = proximos.map((obl) => {
      const vence = new Date(obl.proximoVencimiento);
      const diasRestantes = Math.round((vence - hoy) / (1000 * 60 * 60 * 24));
      return {
        ...obl,
        diasRestantes,
        urgencia: diasRestantes <= 1 ? 'CRITICA' : diasRestantes <= 7 ? 'ALTA' : diasRestantes <= 15 ? 'MEDIA' : 'NORMAL',
      };
    });

    res.json(enriquecidos);
  } catch (err) {
    next(err);
  }
}

async function previewCalendario(req, res, next) {
  try {
    const empresaId = req.params.empresaId;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const vencimientos = calendarioSvc.generarVencimientosAnuales(empresa, anio);
    res.json({ anio, empresa: empresa.nombre, totalVencimientos: vencimientos.length, vencimientos });
  } catch (err) {
    next(err);
  }
}

module.exports = { generar, obtenerAnual, obtenerMes, proximosVencimientos, previewCalendario };
