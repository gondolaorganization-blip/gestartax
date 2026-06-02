const alertaSvc = require('../services/alerta.service');
const calendarioSvc = require('../services/calendario.service');
const prisma = require('../utils/prisma');

async function listar(req, res, next) {
  try {
    const { empresaId } = req.params;
    const soloNoLeidas = req.query.noLeidas === 'true';
    const tipo = req.query.tipo || null;
    const limite = parseInt(req.query.limite) || 100;

    // Actualizar estados vencidos y generar alertas de vencimiento nuevas
    await calendarioSvc.actualizarEstadosVencidos(empresaId);
    await alertaSvc.generarAlertasVencimiento(empresaId);

    const where = { empresaId, activa: true };
    if (soloNoLeidas) where.leida = false;
    if (tipo) where.tipo = tipo;

    const alertas = await prisma.alertaFiscal.findMany({
      where,
      orderBy: [{ prioridad: 'desc' }, { createdAt: 'desc' }],
      take: limite,
    });

    const totalNoLeidas = await alertaSvc.contarAlertasNoLeidas(empresaId);

    // Agrupar por prioridad para el resumen
    const criticas = alertas.filter((a) => a.prioridad === 4 && !a.leida).length;
    const altas    = alertas.filter((a) => a.prioridad === 3 && !a.leida).length;

    res.json({ alertas, totalNoLeidas, criticas, altas });
  } catch (err) { next(err); }
}

async function conteo(req, res, next) {
  try {
    const { empresaId } = req.params;

    // Solo actualiza estados vencidos (ligero, sin generar alertas nuevas)
    await calendarioSvc.actualizarEstadosVencidos(empresaId);

    const totalNoLeidas = await alertaSvc.contarAlertasNoLeidas(empresaId);
    const criticas = await prisma.alertaFiscal.count({
      where: { empresaId, activa: true, leida: false, prioridad: 4 },
    });

    res.json({ totalNoLeidas, criticas });
  } catch (err) { next(err); }
}

async function marcarLeida(req, res, next) {
  try {
    await alertaSvc.marcarAlertaLeida(req.params.alertaId, req.params.empresaId);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function marcarTodasLeidas(req, res, next) {
  try {
    await alertaSvc.marcarTodasLeidas(req.params.empresaId);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function archivar(req, res, next) {
  try {
    const { empresaId, alertaId } = req.params;
    await prisma.alertaFiscal.updateMany({
      where: { id: alertaId, empresaId },
      data: { activa: false, leida: true },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// Crear alerta manual (cambios normativos, nuevas resoluciones DGI)
async function crearManual(req, res, next) {
  try {
    const { empresaId } = req.params;
    const { tipo, mensaje, detalle, fechaVence, prioridad } = req.body;

    if (!tipo || !mensaje) {
      return res.status(400).json({ error: 'tipo y mensaje son requeridos' });
    }

    const alerta = await prisma.alertaFiscal.create({
      data: {
        empresaId,
        tipo: tipo || 'RECORDATORIO',
        mensaje,
        detalle,
        fechaVence: fechaVence ? new Date(fechaVence) : null,
        prioridad: prioridad || 2,
      },
    });
    res.status(201).json(alerta);
  } catch (err) { next(err); }
}

module.exports = { listar, conteo, marcarLeida, marcarTodasLeidas, archivar, crearManual };
