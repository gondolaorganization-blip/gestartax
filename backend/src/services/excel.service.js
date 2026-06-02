// Generación de reportes en Excel (.xlsx) para Gestar Tax.
// Orientados a servir como BORRADOR de los filings a presentar a la DGI.
const ExcelJS = require('exceljs');

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const FMT_MONEDA = '"B/."#,##0.00';
const AZUL = 'FF1E3A5F';
const GRIS = 'FFF1F5F9';

const N = (v) => Number(v) || 0;

function nuevoLibro() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Gestar Tax';
  wb.created = new Date();
  return wb;
}

// Encabezado común con datos de la empresa. Devuelve la fila siguiente libre.
function encabezado(ws, empresa, titulo, subtitulo, anchoCols) {
  ws.mergeCells(1, 1, 1, anchoCols);
  const t = ws.getCell(1, 1);
  t.value = titulo;
  t.font = { bold: true, size: 14, color: { argb: AZUL } };

  ws.mergeCells(2, 1, 2, anchoCols);
  ws.getCell(2, 1).value = subtitulo;
  ws.getCell(2, 1).font = { italic: true, size: 10, color: { argb: 'FF64748B' } };

  ws.getCell(4, 1).value = 'Empresa:';
  ws.getCell(4, 1).font = { bold: true, size: 9 };
  ws.getCell(4, 2).value = empresa?.nombre || '—';
  ws.getCell(5, 1).value = 'RUC:';
  ws.getCell(5, 1).font = { bold: true, size: 9 };
  ws.getCell(5, 2).value = empresa?.ruc || '—';
  ws.getCell(4, 4).value = 'Generado:';
  ws.getCell(4, 4).font = { bold: true, size: 9 };
  ws.getCell(4, 5).value = new Date().toLocaleString('es-PA');

  return 7;
}

function estiloHeaderFila(fila) {
  fila.eachCell((cell) => {
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: AZUL } } };
  });
}

// ─── ITBMS — borrador mensual (Formulario 430) ──────────────────────────────
async function excelITBMS(empresa, anio, declaraciones) {
  const wb = nuevoLibro();
  const ws = wb.addWorksheet(`ITBMS ${anio}`);

  const COLS = ['Mes','Ventas 7%','Ventas 10%','Ventas 15%','Ventas exentas','No sujetas','Total ventas',
    'Débito 7%','Débito 10%','Débito 15%','Débito total','Crédito fiscal','Crédito mes ant.','Saldo a pagar','Saldo a favor','Estado'];

  let fila = encabezado(ws, empresa, `Declaración mensual de ITBMS — ${anio}`, 'BORRADOR · Formulario 430 (Declaración Jurada de ITBMS) — uso interno, no oficial', COLS.length);

  const headerRow = ws.getRow(fila);
  headerRow.values = COLS;
  estiloHeaderFila(headerRow);
  fila++;

  const totales = { v7:0,v10:0,v15:0,ex:0,ns:0,tot:0,d7:0,d10:0,d15:0,dtot:0,cred:0,credAnt:0,pagar:0,favor:0 };

  for (let m = 1; m <= 12; m++) {
    const d = declaraciones.find((x) => x.mes === m);
    const r = ws.getRow(fila);
    if (!d) {
      r.values = [`${MESES[m - 1]} ${anio}`, 0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 'Sin declarar'];
    } else {
      const saldo = N(d.saldo);
      const aPagar = saldo > 0 ? saldo : 0;
      const aFavor = N(d.saldoAFavor) || (saldo < 0 ? -saldo : 0);
      r.values = [
        `${MESES[m - 1]} ${anio}`,
        N(d.ventasGravadas7), N(d.ventasGravadas10), N(d.ventasGravadas15), N(d.ventasExentas), N(d.ventasNoSujetas), N(d.totalVentas),
        N(d.itbmsDebito7), N(d.itbmsDebito10), N(d.itbmsDebito15), N(d.itbmsDebito), N(d.itbmsCredito), N(d.creditoMesAnterior),
        aPagar, aFavor, d.estado,
      ];
      totales.v7+=N(d.ventasGravadas7); totales.v10+=N(d.ventasGravadas10); totales.v15+=N(d.ventasGravadas15);
      totales.ex+=N(d.ventasExentas); totales.ns+=N(d.ventasNoSujetas); totales.tot+=N(d.totalVentas);
      totales.d7+=N(d.itbmsDebito7); totales.d10+=N(d.itbmsDebito10); totales.d15+=N(d.itbmsDebito15); totales.dtot+=N(d.itbmsDebito);
      totales.cred+=N(d.itbmsCredito); totales.credAnt+=N(d.creditoMesAnterior); totales.pagar+=aPagar; totales.favor+=aFavor;
    }
    if (m % 2 === 0) r.eachCell((c) => { c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: GRIS } }; });
    fila++;
  }

  // Fila de totales
  const tr = ws.getRow(fila);
  tr.values = ['TOTAL ANUAL', totales.v7, totales.v10, totales.v15, totales.ex, totales.ns, totales.tot,
    totales.d7, totales.d10, totales.d15, totales.dtot, totales.cred, totales.credAnt, totales.pagar, totales.favor, ''];
  tr.eachCell((c) => { c.font = { bold: true, color:{ argb: AZUL } }; c.border = { top:{ style:'thin', color:{ argb: AZUL } } }; });

  // Formato moneda a las columnas numéricas (2..15)
  for (let col = 2; col <= 15; col++) {
    ws.getColumn(col).numFmt = FMT_MONEDA;
    ws.getColumn(col).width = 14;
  }
  ws.getColumn(1).width = 16;
  ws.getColumn(16).width = 14;

  return wb.xlsx.writeBuffer();
}

// ─── ISR — borrador anual ───────────────────────────────────────────────────
async function excelISR(empresa, anio, isr, anticipos = []) {
  const wb = nuevoLibro();
  const ws = wb.addWorksheet(`ISR ${anio}`);
  let fila = encabezado(ws, empresa, `Declaración de Renta (ISR) — ${anio}`, 'BORRADOR · uso interno, no oficial', 4);

  const linea = (label, valor, bold = false) => {
    const r = ws.getRow(fila);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold, size: 10, color: bold ? { argb: AZUL } : undefined };
    if (valor !== null && valor !== undefined) {
      r.getCell(3).value = N(valor);
      r.getCell(3).numFmt = FMT_MONEDA;
      r.getCell(3).font = { bold, size: 10, color: bold ? { argb: AZUL } : undefined };
    }
    fila++;
  };

  const impA = N(isr.impuestoMetodoA), impB = N(isr.impuestoMetodoB);
  const creditos = N(isr.anticiposPagados) + N(isr.retencionesRecibidas) + N(isr.otrosCreditos);
  linea('Ingresos brutos', isr.ingresosBrutos);
  linea('(-) Gastos deducibles', isr.gastosDeducibles);
  linea('Renta neta gravable', isr.rentaNeta, true);
  fila++;
  linea('Método A — 25% sobre renta neta', impA);
  linea('Método B — CAIR 4.67% sobre ingresos brutos', impB);
  linea(`Método aplicado: ${impB > impA ? 'B (CAIR)' : 'A'}`, null, true);
  linea('Impuesto causado', isr.impuestoCausado, true);
  fila++;
  linea('(-) Anticipos pagados', isr.anticiposPagados);
  linea('(-) Retenciones recibidas', isr.retencionesRecibidas);
  linea('(-) Otros créditos', isr.otrosCreditos);
  linea('Total créditos', creditos, true);
  fila++;
  const saldoFinal = Math.max(0, N(isr.impuestoCausado) - creditos);
  linea('SALDO A PAGAR', saldoFinal, true);

  // Tabla de anticipos
  if (anticipos.length) {
    fila += 2;
    ws.getCell(fila, 1).value = 'Anticipos del año';
    ws.getCell(fila, 1).font = { bold: true, color: { argb: AZUL } };
    fila++;
    const h = ws.getRow(fila);
    h.values = ['Cuota', 'Monto', 'Vencimiento', 'Estado'];
    estiloHeaderFila(h);
    fila++;
    for (const a of anticipos) {
      const r = ws.getRow(fila);
      r.values = [a.cuota, N(a.monto), a.fechaVencimiento ? new Date(a.fechaVencimiento).toLocaleDateString('es-PA') : '—', a.estado];
      r.getCell(2).numFmt = FMT_MONEDA;
      fila++;
    }
  }

  ws.getColumn(1).width = 42; ws.getColumn(2).width = 16; ws.getColumn(3).width = 16; ws.getColumn(4).width = 14;
  return wb.xlsx.writeBuffer();
}

// ─── Posición fiscal — resumen ──────────────────────────────────────────────
async function excelPosicion(empresa, anio, { itbmsResumen, isrAnio, anticipoResumen, proximos = [] }) {
  const wb = nuevoLibro();
  const ws = wb.addWorksheet(`Posición ${anio}`);
  let fila = encabezado(ws, empresa, `Posición Fiscal — ${anio}`, 'Resumen consolidado · uso interno', 4);

  const seccion = (titulo) => {
    ws.getCell(fila, 1).value = titulo;
    ws.getCell(fila, 1).font = { bold: true, size: 11, color: { argb: AZUL } };
    fila++;
  };
  const item = (label, valor, money = true) => {
    const r = ws.getRow(fila);
    r.getCell(1).value = label;
    r.getCell(3).value = money ? N(valor) : valor;
    if (money) r.getCell(3).numFmt = FMT_MONEDA;
    fila++;
  };

  seccion('ITBMS (acumulado del año)');
  item('Total ventas', itbmsResumen.totalVentas);
  item('Débito fiscal', itbmsResumen.totalDebito);
  item('Crédito fiscal', itbmsResumen.totalCredito);
  item('Impuesto pagado', itbmsResumen.impuestoPagado);
  item('Impuesto pendiente', itbmsResumen.impuestoPendiente);
  item('Meses declarados', itbmsResumen.declaradas, false);
  fila++;

  seccion('ISR');
  if (isrAnio) {
    item('Renta neta', isrAnio.rentaNeta);
    item('Impuesto causado', isrAnio.impuestoCausado);
    item('Saldo', isrAnio.saldo);
  } else {
    item('Sin declaración ISR registrada', '—', false);
  }
  fila++;

  seccion('Anticipos ISR');
  item('Total del año', anticipoResumen.total);
  item('Pagado', anticipoResumen.pagado);
  item('Pendiente', anticipoResumen.pendiente);
  item('Cuotas pagadas', anticipoResumen.cuotasPagadas, false);
  fila++;

  if (proximos.length) {
    seccion('Próximos vencimientos (30 días)');
    const h = ws.getRow(fila);
    h.values = ['Obligación', 'Vencimiento', 'Días', 'Urgencia'];
    estiloHeaderFila(h);
    fila++;
    for (const o of proximos) {
      const r = ws.getRow(fila);
      r.values = [o.nombre || o.tipo || 'Obligación', o.proximoVencimiento ? new Date(o.proximoVencimiento).toLocaleDateString('es-PA') : '—', o.diasRestantes, o.urgencia];
      fila++;
    }
  }

  ws.getColumn(1).width = 38; ws.getColumn(2).width = 16; ws.getColumn(3).width = 16; ws.getColumn(4).width = 14;
  return wb.xlsx.writeBuffer();
}

module.exports = { excelITBMS, excelISR, excelPosicion };
