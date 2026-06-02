const prisma = require('../utils/prisma');

// GET /api/pagos/:empresaId  (historial de pagos)
async function listar(req, res, next) {
  try {
    const { empresaId } = req.params;
    const { anio, tipo } = req.query;

    // Pagos ligados a obligaciones de esta empresa
    const whereObl = { empresa: { id: empresaId } };
    if (tipo) whereObl.tipo = tipo;
    if (anio) {
      const a = parseInt(anio);
      whereObl.proximoVencimiento = {
        gte: new Date(a, 0, 1),
        lt:  new Date(a + 1, 0, 1),
      };
    }

    const pagos = await prisma.pagoImpuesto.findMany({
      where: {
        OR: [
          { obligacion: whereObl },
          { anticipo: { empresa: { id: empresaId } } },
        ],
      },
      orderBy: { fecha: 'desc' },
      include: {
        obligacion: { select: { tipo: true, descripcion: true, periodoReferencia: true } },
        anticipo:   { select: { cuota: true, anio: true } },
      },
    });

    res.json(pagos);
  } catch (err) { next(err); }
}

// POST /api/pagos/:empresaId  (registrar pago manual de obligación)
async function registrar(req, res, next) {
  try {
    const { empresaId } = req.params;
    const { obligacionId, monto, fecha, referenciaBanco, banco, observaciones } = req.body;

    if (!obligacionId || !monto || !fecha) {
      return res.status(400).json({ error: 'obligacionId, monto y fecha son requeridos' });
    }

    const obl = await prisma.obligacionFiscal.findFirst({ where: { id: obligacionId, empresaId } });
    if (!obl) return res.status(404).json({ error: 'Obligación no encontrada' });

    const [pago] = await prisma.$transaction([
      prisma.pagoImpuesto.create({
        data: {
          obligacionId,
          monto,
          fecha: new Date(fecha),
          referenciaBanco,
          banco,
          observaciones,
        },
      }),
      prisma.obligacionFiscal.update({
        where: { id: obligacionId },
        data: { estado: 'PAGADA' },
      }),
    ]);

    res.status(201).json(pago);
  } catch (err) { next(err); }
}

module.exports = { listar, registrar };
