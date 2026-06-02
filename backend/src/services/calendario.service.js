/**
 * Motor de calendario fiscal panameño.
 * Genera vencimientos según el Código Fiscal, resoluciones DGI vigentes
 * y ajusta por feriados nacionales y fines de semana.
 */

const prisma = require('../utils/prisma');

// ─── Feriados nacionales de Panamá ────────────────────────────────────────────

function calcularDomingoPascua(anio) {
  // Algoritmo de Butcher para la fecha de Pascua
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-based
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes, dia);
}

function feriadosPanama(anio) {
  const pascua = calcularDomingoPascua(anio);
  const viernesSanto = new Date(pascua); viernesSanto.setDate(pascua.getDate() - 2);
  const martesCarnival = new Date(pascua); martesCarnival.setDate(pascua.getDate() - 47);

  return new Set([
    `${anio}-01-01`, // Año nuevo
    `${anio}-01-09`, // Día de los Mártires
    formatFecha(martesCarnival), // Martes de Carnaval
    formatFecha(viernesSanto),   // Viernes Santo
    `${anio}-05-01`, // Día del trabajo
    `${anio}-11-03`, // Separación de Colombia
    `${anio}-11-04`, // Día de la Bandera
    `${anio}-11-05`, // Día de Colón
    `${anio}-11-10`, // Primer Grito de Independencia
    `${anio}-11-28`, // Independencia de España
    `${anio}-12-08`, // Día de la Madre (Inmaculada)
    `${anio}-12-25`, // Navidad
  ]);
}

function formatFecha(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Mueve la fecha al siguiente día hábil si cae en fin de semana o feriado
function siguienteDiaHabil(fecha, feriados) {
  const f = new Date(fecha);
  while (true) {
    const diaSemana = f.getDay(); // 0=domingo, 6=sábado
    const clave = formatFecha(f);
    if (diaSemana !== 0 && diaSemana !== 6 && !feriados.has(clave)) break;
    f.setDate(f.getDate() + 1);
  }
  return f;
}

// Último día hábil antes o en la fecha dada
function ultimoDiaHabilEnOMes(anio, mes0based, dia, feriados) {
  const f = new Date(anio, mes0based, dia);
  // Si el día es inválido para ese mes, retrocede al último del mes
  while (f.getMonth() !== mes0based) f.setDate(f.getDate() - 1);
  // Retrocede si cae en feriado/fin de semana
  const g = new Date(f);
  while (true) {
    const diaSemana = g.getDay();
    const clave = formatFecha(g);
    if (diaSemana !== 0 && diaSemana !== 6 && !feriados.has(clave)) break;
    g.setDate(g.getDate() - 1);
  }
  return g;
}

const NOMBRES_MES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

// ─── Generador de vencimientos ────────────────────────────────────────────────

function generarVencimientosAnuales(empresa, anio) {
  const feriados = feriadosPanama(anio);
  const fSig = feriadosPanama(anio + 1);
  const esGrande = empresa.esGranContribuyente;
  const regimen = empresa.regimen;
  const vencimientos = [];

  // ── ITBMS (Formulario 430) — mensual ─────────────────────────────────────
  // Grandes contribuyentes: día 10 del mes siguiente
  // Regulares: día 15 del mes siguiente
  // Regímenes SEM y ZLC: exentos de ITBMS de ventas locales (simplificación)
  if (regimen !== 'SEM' && regimen !== 'ZLC') {
    const diaLimite = esGrande ? 10 : 15;
    for (let mes = 1; mes <= 12; mes++) {
      // El vencimiento es en el mes siguiente
      const mesVence = mes === 12 ? 0 : mes; // 0=enero del año sig
      const anioVence = mes === 12 ? anio + 1 : anio;
      const feriadosVence = mes === 12 ? fSig : feriados;
      const fechaBase = new Date(anioVence, mesVence, diaLimite);
      const fechaFinal = siguienteDiaHabil(fechaBase, feriadosVence);

      vencimientos.push({
        tipo: 'ITBMS',
        descripcion: `ITBMS Formulario 430 — ${NOMBRES_MES[mes - 1]} ${anio}`,
        periodoReferencia: `${anio}-${String(mes).padStart(2, '0')}`,
        fechaVencimiento: fechaFinal,
        periodicidad: 'MENSUAL',
        mes,
        anio,
        prioridad: 3,
      });
    }
  }

  // ── ISR Anual — 31 de marzo del año siguiente ─────────────────────────────
  {
    const fechaISR = siguienteDiaHabil(new Date(anio + 1, 2, 31), fSig);
    vencimientos.push({
      tipo: 'ISR',
      descripcion: `ISR Declaración Jurada Anual ${anio}`,
      periodoReferencia: `${anio}`,
      fechaVencimiento: fechaISR,
      periodicidad: 'ANUAL',
      mes: 3,
      anio: anio + 1,
      prioridad: 4,
    });
  }

  // ── Anticipos ISR — 3 cuotas (solo si hay ISR del año anterior) ───────────
  // Cuota 1: 31 de marzo
  // Cuota 2: 30 de junio
  // Cuota 3: 30 de septiembre
  const anticiposFechas = [
    { cuota: 'PRIMERA',  mes0: 2, dia: 31, mesNombre: 'Marzo' },
    { cuota: 'SEGUNDA',  mes0: 5, dia: 30, mesNombre: 'Junio' },
    { cuota: 'TERCERA',  mes0: 8, dia: 30, mesNombre: 'Septiembre' },
  ];
  for (const a of anticiposFechas) {
    const fecha = siguienteDiaHabil(new Date(anio, a.mes0, a.dia), feriados);
    vencimientos.push({
      tipo: 'ANTICIPO_ISR',
      descripcion: `Anticipo ISR ${a.cuota === 'PRIMERA' ? '1ra' : a.cuota === 'SEGUNDA' ? '2da' : '3ra'} cuota — ${a.mesNombre} ${anio}`,
      periodoReferencia: `${anio}-anticipo-${a.cuota.toLowerCase()}`,
      fechaVencimiento: fecha,
      periodicidad: 'ANUAL',
      mes: a.mes0 + 1,
      anio,
      cuota: a.cuota,
      prioridad: 3,
    });
  }

  // ── Aviso de Operación — 31 de marzo cada año ─────────────────────────────
  {
    const fechaAviso = siguienteDiaHabil(new Date(anio, 2, 31), feriados);
    vencimientos.push({
      tipo: 'AVISO_OPERACION',
      descripcion: `Aviso de Operación ${anio}`,
      periodoReferencia: `${anio}`,
      fechaVencimiento: fechaAviso,
      periodicidad: 'ANUAL',
      mes: 3,
      anio,
      prioridad: 3,
    });
  }

  // ── CSS/SEA Patronal — mensual, día 15 del mes siguiente ─────────────────
  for (let mes = 1; mes <= 12; mes++) {
    const mesVence = mes === 12 ? 0 : mes;
    const anioVence = mes === 12 ? anio + 1 : anio;
    const feriadosVence = mes === 12 ? fSig : feriados;
    const fechaBase = new Date(anioVence, mesVence, 15);
    const fechaFinal = siguienteDiaHabil(fechaBase, feriadosVence);

    vencimientos.push({
      tipo: 'CSS_SEA',
      descripcion: `CSS/SEA Patronal — ${NOMBRES_MES[mes - 1]} ${anio}`,
      periodoReferencia: `${anio}-${String(mes).padStart(2, '0')}`,
      fechaVencimiento: fechaFinal,
      periodicidad: 'MENSUAL',
      mes,
      anio,
      prioridad: 3,
    });
  }

  // ── Impuesto de Inmueble — 3 cuotas anuales ───────────────────────────────
  // Cuota 1: 30 de abril
  // Cuota 2: 31 de agosto
  // Cuota 3: 31 de diciembre
  const inmuebleFechas = [
    { cuota: 1, mes0: 3, dia: 30, mesNombre: 'Abril' },
    { cuota: 2, mes0: 7, dia: 31, mesNombre: 'Agosto' },
    { cuota: 3, mes0: 11, dia: 31, mesNombre: 'Diciembre' },
  ];
  for (const i of inmuebleFechas) {
    const fecha = ultimoDiaHabilEnOMes(anio, i.mes0, i.dia, feriados);
    vencimientos.push({
      tipo: 'IMPUESTO_INMUEBLE',
      descripcion: `Impuesto de Inmueble ${i.cuota}ra cuota — ${i.mesNombre} ${anio}`,
      periodoReferencia: `${anio}-inmueble-cuota${i.cuota}`,
      fechaVencimiento: fecha,
      periodicidad: 'ANUAL',
      mes: i.mes0 + 1,
      anio,
      prioridad: 2,
    });
  }

  // ── Retenciones 10% servicios profesionales — mensual ────────────────────
  for (let mes = 1; mes <= 12; mes++) {
    const mesVence = mes === 12 ? 0 : mes;
    const anioVence = mes === 12 ? anio + 1 : anio;
    const feriadosVence = mes === 12 ? fSig : feriados;
    const fechaBase = new Date(anioVence, mesVence, 15);
    const fechaFinal = siguienteDiaHabil(fechaBase, feriadosVence);

    vencimientos.push({
      tipo: 'RETENCION',
      descripcion: `Retenciones — ${NOMBRES_MES[mes - 1]} ${anio}`,
      periodoReferencia: `${anio}-${String(mes).padStart(2, '0')}`,
      fechaVencimiento: fechaFinal,
      periodicidad: 'MENSUAL',
      mes,
      anio,
      prioridad: 2,
    });
  }

  return vencimientos.sort((a, b) => a.fechaVencimiento - b.fechaVencimiento);
}

// ─── Persistencia en DB ───────────────────────────────────────────────────────

async function generarYGuardarCalendario(empresaId, anio) {
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) throw new Error('Empresa no encontrada');

  const vencimientos = generarVencimientosAnuales(empresa, anio);

  // Crear ObligacionFiscal para cada vencimiento que no exista aún
  const obligacionesCreadas = [];
  for (const v of vencimientos) {
    const existe = await prisma.obligacionFiscal.findFirst({
      where: {
        empresaId,
        tipo: v.tipo,
        periodoReferencia: v.periodoReferencia,
      },
    });
    if (!existe) {
      const obl = await prisma.obligacionFiscal.create({
        data: {
          empresaId,
          tipo: v.tipo,
          descripcion: v.descripcion,
          periodoReferencia: v.periodoReferencia,
          proximoVencimiento: v.fechaVencimiento,
          periodicidad: v.periodicidad,
          estado: 'PENDIENTE',
        },
      });
      obligacionesCreadas.push(obl);
    }
  }

  // Agrupar por mes y guardar en CalendarioFiscal
  const porMes = {};
  for (let m = 1; m <= 12; m++) {
    porMes[m] = vencimientos.filter((v) => v.mes === m);
  }

  for (const [mes, items] of Object.entries(porMes)) {
    await prisma.calendarioFiscal.upsert({
      where: { empresaId_mes_anio: { empresaId, mes: Number(mes), anio } },
      update: { obligaciones: items, updatedAt: new Date() },
      create: { empresaId, mes: Number(mes), anio, obligaciones: items },
    });
  }

  return { vencimientos, obligacionesCreadas: obligacionesCreadas.length };
}

async function obtenerCalendarioMes(empresaId, anio, mes) {
  const registro = await prisma.calendarioFiscal.findUnique({
    where: { empresaId_mes_anio: { empresaId, mes, anio } },
  });
  if (!registro) return [];
  return registro.obligaciones;
}

async function obtenerCalendarioAnual(empresaId, anio) {
  const registros = await prisma.calendarioFiscal.findMany({
    where: { empresaId, anio },
    orderBy: { mes: 'asc' },
  });
  return registros;
}

async function obtenerProximosVencimientos(empresaId, dias = 30) {
  const hoy = new Date();
  const limite = new Date();
  limite.setDate(hoy.getDate() + dias);

  return prisma.obligacionFiscal.findMany({
    where: {
      empresaId,
      estado: { in: ['PENDIENTE'] },
      proximoVencimiento: { gte: hoy, lte: limite },
    },
    orderBy: { proximoVencimiento: 'asc' },
  });
}

async function actualizarEstadosVencidos(empresaId) {
  const hoy = new Date();
  const { count } = await prisma.obligacionFiscal.updateMany({
    where: {
      empresaId,
      estado: 'PENDIENTE',
      proximoVencimiento: { lt: hoy },
    },
    data: { estado: 'VENCIDA' },
  });
  return count;
}

module.exports = {
  generarVencimientosAnuales,
  generarYGuardarCalendario,
  obtenerCalendarioMes,
  obtenerCalendarioAnual,
  obtenerProximosVencimientos,
  actualizarEstadosVencidos,
  feriadosPanama,
  formatFecha,
};
