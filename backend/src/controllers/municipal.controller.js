const prisma = require('../utils/prisma');

// ─── Obligaciones ─────────────────────────────────────────────────────────────

async function listarObligaciones(req, res, next) {
  try {
    const { empresaId } = req.params;
    const obligaciones = await prisma.obligacionMunicipal.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
      include: {
        pagos: {
          orderBy: { anio: 'desc' },
          take: 8,
        },
      },
    });
    res.json(obligaciones);
  } catch (err) { next(err); }
}

async function crearObligacion(req, res, next) {
  try {
    const { empresaId } = req.params;
    const { nombre, municipio, descripcion, periodicidad, montoFijo } = req.body;

    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

    const obl = await prisma.obligacionMunicipal.create({
      data: {
        empresaId,
        nombre,
        municipio,
        descripcion,
        periodicidad: periodicidad || 'ANUAL',
        montoFijo:    montoFijo ? parseFloat(montoFijo) : null,
      },
      include: { pagos: true },
    });
    res.status(201).json(obl);
  } catch (err) { next(err); }
}

async function actualizarObligacion(req, res, next) {
  try {
    const { empresaId, id } = req.params;
    const obl = await prisma.obligacionMunicipal.findFirst({ where: { id, empresaId } });
    if (!obl) return res.status(404).json({ error: 'Obligación no encontrada' });

    const { nombre, municipio, descripcion, periodicidad, montoFijo, activa } = req.body;
    const actualizada = await prisma.obligacionMunicipal.update({
      where: { id },
      data: { nombre, municipio, descripcion, periodicidad, montoFijo: montoFijo ? parseFloat(montoFijo) : obl.montoFijo, activa },
      include: { pagos: { orderBy: { anio: 'desc' }, take: 8 } },
    });
    res.json(actualizada);
  } catch (err) { next(err); }
}

// ─── Pagos ────────────────────────────────────────────────────────────────────

async function crearPago(req, res, next) {
  try {
    const { empresaId, obligacionId } = req.params;
    const { anio, periodo, monto, fechaVence, referencia, observaciones } = req.body;

    const obl = await prisma.obligacionMunicipal.findFirst({ where: { id: obligacionId, empresaId } });
    if (!obl) return res.status(404).json({ error: 'Obligación no encontrada' });

    if (!monto || !fechaVence || !anio) {
      return res.status(400).json({ error: 'Monto, año y fecha de vencimiento son requeridos' });
    }

    const pago = await prisma.pagoMunicipal.create({
      data: {
        obligacionId,
        anio: parseInt(anio),
        periodo,
        monto: parseFloat(monto),
        fechaVence: new Date(fechaVence),
        referencia,
        observaciones,
      },
    });
    res.status(201).json(pago);
  } catch (err) { next(err); }
}

async function registrarPago(req, res, next) {
  try {
    const { empresaId, obligacionId, pagoId } = req.params;
    const { fechaPago, referencia } = req.body;

    const obl = await prisma.obligacionMunicipal.findFirst({ where: { id: obligacionId, empresaId } });
    if (!obl) return res.status(404).json({ error: 'Obligación no encontrada' });

    const pago = await prisma.pagoMunicipal.update({
      where: { id: pagoId },
      data: {
        estado: 'PAGADA',
        fechaPago: fechaPago ? new Date(fechaPago) : new Date(),
        referencia,
      },
    });
    res.json(pago);
  } catch (err) { next(err); }
}

module.exports = { listarObligaciones, crearObligacion, actualizarObligacion, crearPago, registrarPago };
