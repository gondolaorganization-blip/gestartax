const prisma = require('../utils/prisma');

const R = (n) => Math.round(Number(n) * 100) / 100;

function calcular(datos) {
  const utilidad   = R(Number(datos.utilidadNeta)          || 0);
  const divLocal   = R(Number(datos.dividendosLocales)      || 0);
  const divExt     = R(Number(datos.dividendosExtranjeros)  || 0);

  const retLocal   = R(divLocal  * 0.10);
  const retExt     = R(divExt    * 0.05);
  const baseComp   = R(Math.max(utilidad - divLocal - divExt, 0));
  const comp       = R(baseComp  * 0.10);
  const total      = R(retLocal + retExt + comp);

  return { retencionLocal: retLocal, retencionExtranjera: retExt, baseComplementario: baseComp, complementario: comp, totalImpuesto: total };
}

async function listar(req, res, next) {
  try {
    const { empresaId } = req.params;
    const decls = await prisma.declaracionDividendos.findMany({
      where: { empresaId },
      orderBy: { anio: 'desc' },
    });
    res.json(decls);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { empresaId } = req.params;
    const { anio, utilidadNeta, dividendosLocales, dividendosExtranjeros, observaciones } = req.body;

    if (!anio) return res.status(400).json({ error: 'Año es requerido' });

    const existe = await prisma.declaracionDividendos.findUnique({
      where: { empresaId_anio: { empresaId, anio: parseInt(anio) } },
    });
    if (existe) return res.status(409).json({ error: `Ya existe declaración de dividendos para ${anio}` });

    const calculado = calcular({ utilidadNeta, dividendosLocales, dividendosExtranjeros });

    const decl = await prisma.declaracionDividendos.create({
      data: {
        empresaId,
        anio: parseInt(anio),
        utilidadNeta:          Number(utilidadNeta)          || 0,
        dividendosLocales:     Number(dividendosLocales)     || 0,
        dividendosExtranjeros: Number(dividendosExtranjeros) || 0,
        observaciones,
        ...calculado,
      },
    });
    res.status(201).json(decl);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const { empresaId, id } = req.params;

    const existe = await prisma.declaracionDividendos.findFirst({ where: { id, empresaId } });
    if (!existe) return res.status(404).json({ error: 'Declaración no encontrada' });
    if (existe.estado === 'PAGADA') return res.status(400).json({ error: 'No se puede modificar una declaración pagada' });

    const { utilidadNeta, dividendosLocales, dividendosExtranjeros, observaciones, estado } = req.body;
    const calculado = calcular({
      utilidadNeta:          utilidadNeta          ?? existe.utilidadNeta,
      dividendosLocales:     dividendosLocales     ?? existe.dividendosLocales,
      dividendosExtranjeros: dividendosExtranjeros ?? existe.dividendosExtranjeros,
    });

    const actualizado = await prisma.declaracionDividendos.update({
      where: { id },
      data: {
        utilidadNeta:          Number(utilidadNeta)          ?? existe.utilidadNeta,
        dividendosLocales:     Number(dividendosLocales)     ?? existe.dividendosLocales,
        dividendosExtranjeros: Number(dividendosExtranjeros) ?? existe.dividendosExtranjeros,
        observaciones:         observaciones ?? existe.observaciones,
        estado:                estado        ?? existe.estado,
        fechaPresentacion:     estado === 'PRESENTADA' ? new Date() : existe.fechaPresentacion,
        ...calculado,
      },
    });
    res.json(actualizado);
  } catch (err) { next(err); }
}

module.exports = { listar, crear, actualizar };
