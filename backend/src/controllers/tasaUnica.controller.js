const prisma = require('../utils/prisma');

const MONTO_SA  = 300;
const MONTO_FIP = 300;

function montoSegunTipo(tipo) {
  if (tipo === 'SA')  return MONTO_SA;
  if (tipo === 'FIP') return MONTO_FIP;
  return MONTO_SA;
}

async function listar(req, res, next) {
  try {
    const { empresaId } = req.params;
    const tasas = await prisma.tasaUnica.findMany({
      where: { empresaId },
      orderBy: { anio: 'desc' },
    });
    res.json(tasas);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { empresaId } = req.params;
    const { anio, tipoSociedad = 'SA', monto, fechaVence, referencia, observaciones } = req.body;

    if (!anio || !fechaVence) {
      return res.status(400).json({ error: 'Año y fecha de vencimiento son requeridos' });
    }

    const existe = await prisma.tasaUnica.findUnique({
      where: { empresaId_anio: { empresaId, anio: parseInt(anio) } },
    });
    if (existe) return res.status(409).json({ error: `Ya existe Tasa Única para ${anio}` });

    const montoFinal = monto ?? montoSegunTipo(tipoSociedad);

    const tasa = await prisma.tasaUnica.create({
      data: {
        empresaId,
        anio: parseInt(anio),
        tipoSociedad,
        monto: montoFinal,
        fechaVence: new Date(fechaVence),
        referencia,
        observaciones,
      },
    });
    res.status(201).json(tasa);
  } catch (err) { next(err); }
}

async function registrarPago(req, res, next) {
  try {
    const { empresaId, id } = req.params;
    const { fechaPago, referencia, observaciones } = req.body;

    const tasa = await prisma.tasaUnica.findFirst({ where: { id, empresaId } });
    if (!tasa) return res.status(404).json({ error: 'Registro no encontrado' });

    const actualizada = await prisma.tasaUnica.update({
      where: { id },
      data: {
        estado: 'PAGADA',
        fechaPago: fechaPago ? new Date(fechaPago) : new Date(),
        referencia: referencia ?? tasa.referencia,
        observaciones: observaciones ?? tasa.observaciones,
      },
    });
    res.json(actualizada);
  } catch (err) { next(err); }
}

async function generarAnio(req, res, next) {
  try {
    const { empresaId } = req.params;
    const anio = parseInt(req.body.anio) || new Date().getFullYear();
    const tipoSociedad = req.body.tipoSociedad || 'SA';

    const existe = await prisma.tasaUnica.findUnique({
      where: { empresaId_anio: { empresaId, anio } },
    });
    if (existe) return res.status(409).json({ error: `Ya existe Tasa Única para ${anio}` });

    const tasa = await prisma.tasaUnica.create({
      data: {
        empresaId,
        anio,
        tipoSociedad,
        monto: montoSegunTipo(tipoSociedad),
        fechaVence: new Date(anio, 5, 30), // 30 de junio
      },
    });
    res.status(201).json(tasa);
  } catch (err) { next(err); }
}

module.exports = { listar, crear, registrarPago, generarAnio };
