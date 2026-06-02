const prisma = require('../utils/prisma');

// GET /api/obligaciones/:empresaId  (con ?tipo=CSS_SEA&estado=PENDIENTE)
async function listar(req, res, next) {
  try {
    const { empresaId } = req.params;
    const { tipo, estado, anio } = req.query;

    const where = { empresaId };
    if (tipo)   where.tipo   = tipo;
    if (estado) where.estado = estado;
    if (anio) {
      const a = parseInt(anio);
      where.proximoVencimiento = {
        gte: new Date(a, 0, 1),
        lt:  new Date(a + 1, 0, 1),
      };
    }

    const obligaciones = await prisma.obligacionFiscal.findMany({
      where,
      orderBy: { proximoVencimiento: 'asc' },
      include: { pagos: { orderBy: { fecha: 'desc' } } },
    });

    res.json(obligaciones);
  } catch (err) { next(err); }
}

// PUT /api/obligaciones/:empresaId/:id/estado
async function actualizarEstado(req, res, next) {
  try {
    const { empresaId, id } = req.params;
    const { estado, montoEstimado } = req.body;

    const obl = await prisma.obligacionFiscal.findFirst({ where: { id, empresaId } });
    if (!obl) return res.status(404).json({ error: 'Obligación no encontrada' });

    const actualizada = await prisma.obligacionFiscal.update({
      where: { id },
      data: { estado, ...(montoEstimado !== undefined && { montoEstimado }) },
    });
    res.json(actualizada);
  } catch (err) { next(err); }
}

module.exports = { listar, actualizarEstado };
