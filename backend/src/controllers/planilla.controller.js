const prisma = require('../utils/prisma');

const R = (n) => Math.round(Number(n) * 100) / 100;

// ─── Tasas CSS/SEA Panamá ─────────────────────────────────────────────────────
const CSS_EMP = 0.0975;
const SEA_EMP = 0.0125;
const CSS_PAT = 0.1225;
const SEA_PAT = 0.015;

function calcularISRAnual(salarioAnual) {
  if (salarioAnual <= 11000) return 0;
  if (salarioAnual <= 100000) return (salarioAnual - 11000) * 0.15;
  return (100000 - 11000) * 0.15 + (salarioAnual - 100000) * 0.25;
}

function calcularLinea(empleado, tipo) {
  const divisor = empleado.periodoPago === 'QUINCENAL' ? 2 : 1;
  let salarioBruto;

  if (tipo === 'DECIMO') {
    salarioBruto = R(Number(empleado.salarioMensual) / 3);
  } else {
    salarioBruto = R(Number(empleado.salarioMensual) / divisor);
  }

  const cssEmp = R(salarioBruto * CSS_EMP);
  const seaEmp = R(salarioBruto * SEA_EMP);
  const isr    = tipo === 'DECIMO' ? 0 : R(calcularISRAnual(Number(empleado.salarioMensual) * 12) / 12 / divisor);

  const totalDeduccion = R(cssEmp + seaEmp + isr);
  const salarioNeto    = R(salarioBruto - totalDeduccion);
  const cssPatrono     = R(salarioBruto * CSS_PAT);
  const seaPatrono     = R(salarioBruto * SEA_PAT);

  return { salarioBruto, cssEmpleado: cssEmp, seaEmpleado: seaEmp, isr, totalDeduccion, salarioNeto, cssPatrono, seaPatrono };
}

// ─── EMPLEADOS ────────────────────────────────────────────────────────────────

async function listarEmpleados(req, res, next) {
  try {
    const { empresaId } = req.params;
    const empleados = await prisma.empleado.findMany({
      where: { empresaId },
      orderBy: [{ activo: 'desc' }, { apellido: 'asc' }],
    });
    res.json(empleados);
  } catch (err) { next(err); }
}

async function crearEmpleado(req, res, next) {
  try {
    const { empresaId } = req.params;
    const { cedula, nombre, apellido, cargo, departamento, fechaIngreso, tipoContrato, salarioMensual, periodoPago } = req.body;

    const existe = await prisma.empleado.findUnique({ where: { empresaId_cedula: { empresaId, cedula } } });
    if (existe) return res.status(409).json({ error: 'Ya existe un empleado con esa cédula' });

    const empleado = await prisma.empleado.create({
      data: { empresaId, cedula, nombre, apellido, cargo, departamento, fechaIngreso: new Date(fechaIngreso), tipoContrato, salarioMensual: parseFloat(salarioMensual), periodoPago },
    });
    res.status(201).json(empleado);
  } catch (err) { next(err); }
}

async function actualizarEmpleado(req, res, next) {
  try {
    const { empresaId, id } = req.params;
    const emp = await prisma.empleado.findFirst({ where: { id, empresaId } });
    if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });

    const { cedula, nombre, apellido, cargo, departamento, fechaIngreso, tipoContrato, salarioMensual, periodoPago, activo } = req.body;

    const actualizado = await prisma.empleado.update({
      where: { id },
      data: {
        cedula:         cedula         ?? emp.cedula,
        nombre:         nombre         ?? emp.nombre,
        apellido:       apellido       ?? emp.apellido,
        cargo:          cargo          ?? emp.cargo,
        departamento:   departamento   ?? emp.departamento,
        fechaIngreso:   fechaIngreso   ? new Date(fechaIngreso) : emp.fechaIngreso,
        tipoContrato:   tipoContrato   ?? emp.tipoContrato,
        salarioMensual: salarioMensual ? parseFloat(salarioMensual) : emp.salarioMensual,
        periodoPago:    periodoPago    ?? emp.periodoPago,
        activo:         activo         ?? emp.activo,
      },
    });
    res.json(actualizado);
  } catch (err) { next(err); }
}

// ─── PLANILLA ─────────────────────────────────────────────────────────────────

async function listarPeriodos(req, res, next) {
  try {
    const { empresaId } = req.params;
    const { anio } = req.query;
    const where = { empresaId, ...(anio && { anio: parseInt(anio) }) };
    const periodos = await prisma.periodoPlanilla.findMany({
      where,
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { tipo: 'asc' }],
      include: { _count: { select: { lineas: true } } },
    });
    res.json(periodos);
  } catch (err) { next(err); }
}

async function obtenerPeriodo(req, res, next) {
  try {
    const { empresaId, id } = req.params;
    const periodo = await prisma.periodoPlanilla.findFirst({
      where: { id, empresaId },
      include: {
        lineas: {
          include: { empleado: { select: { id: true, cedula: true, nombre: true, apellido: true, cargo: true, departamento: true } } },
          orderBy: { empleado: { apellido: 'asc' } },
        },
      },
    });
    if (!periodo) return res.status(404).json({ error: 'Período no encontrado' });
    res.json(periodo);
  } catch (err) { next(err); }
}

async function crearPeriodo(req, res, next) {
  try {
    const { empresaId } = req.params;
    const { tipo = 'REGULAR', mes, anio, fechaInicio, fechaFin, fechaPago, notas } = req.body;

    if (!mes || !anio || !fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Mes, año, fecha de inicio y fin son requeridos' });
    }

    const mesNum  = parseInt(mes);
    const anioNum = parseInt(anio);

    const existe = await prisma.periodoPlanilla.findUnique({
      where: { empresaId_tipo_mes_anio: { empresaId, tipo, mes: mesNum, anio: anioNum } },
    });
    if (existe) return res.status(409).json({ error: `Ya existe una planilla ${tipo} para ${mesNum}/${anioNum}` });

    const empleados = await prisma.empleado.findMany({ where: { empresaId, activo: true } });
    if (empleados.length === 0) return res.status(400).json({ error: 'No hay empleados activos' });

    const lineas = empleados.map((emp) => ({ empleadoId: emp.id, ...calcularLinea(emp, tipo) }));

    const totales = lineas.reduce((acc, l) => ({
      totalBruto:  R(acc.totalBruto  + l.salarioBruto),
      totalCSSEmp: R(acc.totalCSSEmp + l.cssEmpleado),
      totalSEAEmp: R(acc.totalSEAEmp + l.seaEmpleado),
      totalISR:    R(acc.totalISR    + l.isr),
      totalNeto:   R(acc.totalNeto   + l.salarioNeto),
      totalCSSPat: R(acc.totalCSSPat + l.cssPatrono),
      totalSEAPat: R(acc.totalSEAPat + l.seaPatrono),
      totalPatrono: R(acc.totalPatrono + l.cssPatrono + l.seaPatrono),
    }), { totalBruto: 0, totalCSSEmp: 0, totalSEAEmp: 0, totalISR: 0, totalNeto: 0, totalCSSPat: 0, totalSEAPat: 0, totalPatrono: 0 });

    const periodo = await prisma.periodoPlanilla.create({
      data: {
        empresaId, tipo, mes: mesNum, anio: anioNum,
        fechaInicio: new Date(fechaInicio),
        fechaFin:    new Date(fechaFin),
        fechaPago:   fechaPago ? new Date(fechaPago) : null,
        notas,
        ...totales,
        lineas: { create: lineas },
      },
      include: { lineas: { include: { empleado: { select: { id: true, cedula: true, nombre: true, apellido: true, cargo: true } } } } },
    });

    // Actualizar monto estimado en la obligación CSS_SEA del mes
    const periodoRef = `${anioNum}-${String(mesNum).padStart(2, '0')}`;
    await prisma.obligacionFiscal.updateMany({
      where: { empresaId, tipo: 'CSS_SEA', periodoReferencia: periodoRef },
      data: { montoEstimado: totales.totalCSSEmp + totales.totalSEAEmp + totales.totalCSSPat + totales.totalSEAPat },
    });

    res.status(201).json(periodo);
  } catch (err) { next(err); }
}

async function cambiarEstado(req, res, next) {
  try {
    const { empresaId, id } = req.params;
    const { estado } = req.body;

    if (!['BORRADOR', 'APROBADA', 'PAGADA'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const periodo = await prisma.periodoPlanilla.findFirst({ where: { id, empresaId } });
    if (!periodo) return res.status(404).json({ error: 'Período no encontrado' });

    const actualizado = await prisma.periodoPlanilla.update({
      where: { id },
      data: { estado },
    });

    if (estado === 'PAGADA') {
      const periodoRef = `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}`;
      await prisma.obligacionFiscal.updateMany({
        where: { empresaId, tipo: 'CSS_SEA', periodoReferencia: periodoRef },
        data: { estado: 'PAGADA' },
      });
    }

    res.json(actualizado);
  } catch (err) { next(err); }
}

module.exports = { listarEmpleados, crearEmpleado, actualizarEmpleado, listarPeriodos, obtenerPeriodo, crearPeriodo, cambiarEstado };
