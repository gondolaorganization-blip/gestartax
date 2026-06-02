const prisma = require('../utils/prisma');

// ─── Cálculo de tasa — Ley 66 de 2017 ────────────────────────────────────────
function calcularTasa(valorCatastral, tipoUso) {
  const valor = Number(valorCatastral);

  if (tipoUso === 'VIVIENDA_PRINCIPAL' || tipoUso === 'PATRIMONIO_FAMILIAR') {
    if (valor <= 120000) return 0;
    if (valor <= 700000) return 0.5;
    return 0.7;
  }

  // OTRO (comercial, segunda residencia, terrenos, etc.)
  if (valor <= 30000)  return 0;
  if (valor <= 250000) return 0.6;
  if (valor <= 500000) return 0.8;
  return 1.0;
}

// GET /api/empresas/:empresaId/inmuebles
async function listar(req, res, next) {
  try {
    const { empresaId } = req.params;
    const propiedades = await prisma.propiedadInmueble.findMany({
      where: { empresaId },
      include: { cuotas: { orderBy: [{ anio: 'desc' }, { numeroCuota: 'asc' }], take: 6 } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(propiedades);
  } catch (err) { next(err); }
}

// POST /api/empresas/:empresaId/inmuebles
async function crear(req, res, next) {
  try {
    const { empresaId } = req.params;
    const { descripcion, ubicacion, finca, valorCatastral, tipoUso = 'OTRO', exenta } = req.body;

    if (!descripcion || !valorCatastral) {
      return res.status(400).json({ error: 'descripcion y valorCatastral son requeridos' });
    }

    const tasaImpuesto = calcularTasa(valorCatastral, tipoUso);

    const propiedad = await prisma.propiedadInmueble.create({
      data: {
        empresaId,
        descripcion,
        ubicacion,
        finca,
        valorCatastral,
        tipoUso,
        tasaImpuesto,
        exenta: exenta ?? false,
      },
    });

    // Generar cuotas del año actual
    const anio = new Date().getFullYear();
    await generarCuotasAnio(propiedad, anio);

    const resultado = await prisma.propiedadInmueble.findUnique({
      where: { id: propiedad.id },
      include: { cuotas: { orderBy: { numeroCuota: 'asc' } } },
    });
    res.status(201).json(resultado);
  } catch (err) { next(err); }
}

// PUT /api/empresas/:empresaId/inmuebles/:id
async function actualizar(req, res, next) {
  try {
    const { empresaId, id } = req.params;
    const { descripcion, ubicacion, finca, valorCatastral, tipoUso, exenta, activa } = req.body;

    const existe = await prisma.propiedadInmueble.findFirst({ where: { id, empresaId } });
    if (!existe) return res.status(404).json({ error: 'Propiedad no encontrada' });

    const nuevoValor = valorCatastral ?? existe.valorCatastral;
    const nuevoTipo  = tipoUso ?? existe.tipoUso;
    const tasaImpuesto = calcularTasa(nuevoValor, nuevoTipo);

    const actualizada = await prisma.propiedadInmueble.update({
      where: { id },
      data: { descripcion, ubicacion, finca, valorCatastral, tipoUso, tasaImpuesto, exenta, activa },
      include: { cuotas: { orderBy: [{ anio: 'desc' }, { numeroCuota: 'asc' }], take: 6 } },
    });
    res.json(actualizada);
  } catch (err) { next(err); }
}

// POST /api/empresas/:empresaId/inmuebles/:id/cuotas/generar
async function generarCuotas(req, res, next) {
  try {
    const { empresaId, id } = req.params;
    const anio = parseInt(req.body.anio) || new Date().getFullYear();

    const propiedad = await prisma.propiedadInmueble.findFirst({ where: { id, empresaId } });
    if (!propiedad) return res.status(404).json({ error: 'Propiedad no encontrada' });

    const existentes = await prisma.cuotaInmueble.count({ where: { propiedadId: id, anio } });
    if (existentes > 0) return res.status(409).json({ error: `Ya existen cuotas para ${anio}` });

    const cuotas = await generarCuotasAnio(propiedad, anio);
    res.status(201).json(cuotas);
  } catch (err) { next(err); }
}

// PUT /api/empresas/:empresaId/inmuebles/:propiedadId/cuotas/:cuotaId/pagar
async function pagarCuota(req, res, next) {
  try {
    const { empresaId, propiedadId, cuotaId } = req.params;
    const { fechaPago } = req.body;

    const propiedad = await prisma.propiedadInmueble.findFirst({ where: { id: propiedadId, empresaId } });
    if (!propiedad) return res.status(404).json({ error: 'Propiedad no encontrada' });

    const cuota = await prisma.cuotaInmueble.update({
      where: { id: cuotaId },
      data: { estado: 'PAGADA', fechaPago: fechaPago ? new Date(fechaPago) : new Date() },
    });
    res.json(cuota);
  } catch (err) { next(err); }
}

// ── Util ──────────────────────────────────────────────────────────────────────
async function generarCuotasAnio(propiedad, anio) {
  const impuestoAnual = Number(propiedad.valorCatastral) * (Number(propiedad.tasaImpuesto) / 100);
  const montoCuota = impuestoAnual / 3;

  const fechasVence = [
    new Date(anio, 4 - 1, 30), // 30 Abril  — Art. 786 Código Fiscal
    new Date(anio, 8 - 1, 31), // 31 Agosto
    new Date(anio, 12 - 1, 31), // 31 Diciembre
  ];

  const cuotas = await prisma.$transaction(
    fechasVence.map((fecha, i) =>
      prisma.cuotaInmueble.create({
        data: {
          propiedadId: propiedad.id,
          anio,
          numeroCuota: i + 1,
          monto: montoCuota,
          fechaVence: fecha,
          estado: 'PENDIENTE',
        },
      })
    )
  );
  return cuotas;
}

module.exports = { listar, crear, actualizar, generarCuotas, pagarCuota };
