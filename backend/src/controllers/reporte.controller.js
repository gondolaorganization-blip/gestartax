const prisma = require('../utils/prisma');

function enviarPdf(res, docDef, nombreArchivo) {
  return new Promise((resolve, reject) => {
    const pdfmake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    pdfmake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

    const doc = pdfmake.createPdf(docDef);
    doc.getBuffer((buffer) => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(Buffer.from(buffer));
      resolve();
    });
  });
}

// GET /api/reportes/:empresaId/itbms?anio=2025
async function reporteITBMS(req, res, next) {
  try {
    const { empresaId } = req.params;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();

    const [empresa, declaraciones] = await Promise.all([
      prisma.empresa.findUnique({ where: { id: empresaId } }),
      prisma.declaracionITBMS.findMany({
        where: { empresaId, anio },
        orderBy: { mes: 'asc' },
      }),
    ]);

    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    const totales = declaraciones.reduce(
      (acc, d) => ({
        ventas: acc.ventas + Number(d.totalVentas),
        debito: acc.debito + Number(d.itbmsDebito),
        credito: acc.credito + Number(d.itbmsCredito) + Number(d.creditoMesAnterior || 0),
        saldo: acc.saldo + Number(d.saldo),
      }),
      { ventas: 0, debito: 0, credito: 0, saldo: 0 }
    );

    const usd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
    const fechaCorta = (f) => f ? new Date(f).toLocaleDateString('es-PA') : '—';
    const estadoColor = (e) => ({ PAGADA: '#16a34a', PRESENTADA: '#2563eb', BORRADOR: '#94a3b8', VENCIDA: '#dc2626' })[e] || '#1e293b';

    const cuerpoTabla = [
      [
        { text: 'Mes', style: 'thTabla' },
        { text: 'Ventas Gravadas', style: 'thTabla', alignment: 'right' },
        { text: 'Débito ITBMS', style: 'thTabla', alignment: 'right' },
        { text: 'Crédito Fiscal', style: 'thTabla', alignment: 'right' },
        { text: 'Saldo', style: 'thTabla', alignment: 'right' },
        { text: 'Estado', style: 'thTabla', alignment: 'center' },
      ],
      ...MESES.map((label, i) => {
        const mes = i + 1;
        const d = declaraciones.find((x) => x.mes === mes);
        if (!d) {
          return [
            { text: `${label} ${anio}`, style: 'tdTabla' },
            { text: '—', style: 'tdTabla', alignment: 'right', color: '#94a3b8' },
            { text: '—', style: 'tdTabla', alignment: 'right', color: '#94a3b8' },
            { text: '—', style: 'tdTabla', alignment: 'right', color: '#94a3b8' },
            { text: '—', style: 'tdTabla', alignment: 'right', color: '#94a3b8' },
            { text: 'Sin declarar', style: 'tdTabla', alignment: 'center', color: '#94a3b8' },
          ];
        }
        const saldoN = Number(d.saldo);
        return [
          { text: `${label} ${anio}`, style: 'tdTabla' },
          { text: usd(d.totalVentas), style: 'tdTabla', alignment: 'right' },
          { text: usd(d.itbmsDebito), style: 'tdTabla', alignment: 'right' },
          { text: usd(Number(d.itbmsCredito) + Number(d.creditoMesAnterior || 0)), style: 'tdTabla', alignment: 'right' },
          { text: usd(saldoN), style: 'tdTabla', alignment: 'right', color: saldoN < 0 ? '#16a34a' : '#1e293b' },
          { text: d.estado, style: 'tdTabla', alignment: 'center', color: estadoColor(d.estado) },
        ];
      }),
      [
        { text: 'TOTAL ANUAL', style: 'tdTotalLabel' },
        { text: usd(totales.ventas), style: 'tdTotal', alignment: 'right' },
        { text: usd(totales.debito), style: 'tdTotal', alignment: 'right' },
        { text: usd(totales.credito), style: 'tdTotal', alignment: 'right' },
        { text: usd(totales.saldo), style: 'tdTotal', alignment: 'right' },
        { text: `${declaraciones.length} decl.`, style: 'tdTotal', alignment: 'center' },
      ],
    ];

    const tablaLayout = {
      hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
      vLineWidth: () => 0,
      hLineColor: (i) => (i === 0 || i === 1 ? '#1e3a5f' : '#e2e8f0'),
      fillColor: (i) => (i === 0 ? '#1e3a5f' : i % 2 === 0 ? '#f8fafc' : null),
    };

    const docDef = {
      pageSize: 'LETTER',
      pageMargins: [40, 40, 40, 50],
      footer: (page, pages) => ({
        columns: [
          { text: `Gestar Tax — ${empresa.nombre} — ITBMS ${anio}`, fontSize: 7, color: '#94a3b8', marginLeft: 40 },
          { text: `Pág. ${page} de ${pages}`, fontSize: 7, color: '#94a3b8', alignment: 'right', marginRight: 40 },
        ],
      }),
      content: [
        {
          columns: [
            { stack: [{ text: 'TAXGESTAR', fontSize: 18, bold: true, color: '#1e3a5f' }, { text: 'Gestión Tributaria de Panamá', fontSize: 8, color: '#94a3b8' }] },
            { stack: [
              { text: 'REPORTE ITBMS ANUAL', fontSize: 14, bold: true, color: '#1e3a5f', alignment: 'right' },
              { text: empresa.nombre, fontSize: 11, bold: true, alignment: 'right' },
              { text: `RUC: ${empresa.ruc || '—'}  |  Año: ${anio}`, fontSize: 8, color: '#94a3b8', alignment: 'right' },
            ]},
          ],
          marginBottom: 10,
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#1e3a5f' }] },
        { text: `Generado el ${fechaCorta(new Date())}`, fontSize: 7, color: '#94a3b8', italics: true, marginTop: 4, marginBottom: 16 },
        { text: `Resumen de declaraciones ITBMS del año fiscal ${anio}.`, fontSize: 9, color: '#475569', marginBottom: 12 },
        { text: 'Detalle Mensual', fontSize: 11, bold: true, color: '#1e3a5f', marginBottom: 6, decoration: 'underline' },
        { table: { headerRows: 1, widths: ['*', 90, 80, 80, 80, 70], body: cuerpoTabla }, layout: tablaLayout },
        {
          columns: [
            { stack: [{ text: 'Total Ventas', fontSize: 8, color: '#64748b', marginBottom: 2 }, { text: usd(totales.ventas), fontSize: 11, bold: true, color: '#1e3a5f' }], fillColor: '#f1f5f9', margin: [8, 6, 8, 6] },
            { stack: [{ text: 'Total Débito', fontSize: 8, color: '#64748b', marginBottom: 2 }, { text: usd(totales.debito), fontSize: 11, bold: true, color: '#dc2626' }], fillColor: '#f1f5f9', margin: [8, 6, 8, 6] },
            { stack: [{ text: 'Total Crédito', fontSize: 8, color: '#64748b', marginBottom: 2 }, { text: usd(totales.credito), fontSize: 11, bold: true, color: '#16a34a' }], fillColor: '#f1f5f9', margin: [8, 6, 8, 6] },
            { stack: [{ text: 'Posición Neta', fontSize: 8, color: '#64748b', marginBottom: 2 }, { text: usd(totales.saldo), fontSize: 11, bold: true, color: totales.saldo > 0 ? '#dc2626' : '#16a34a' }], fillColor: '#f1f5f9', margin: [8, 6, 8, 6] },
          ],
          columnGap: 8,
          marginTop: 16,
        },
      ],
      styles: estilosBase(),
    };

    await enviarPdf(res, docDef, `itbms_${empresa.ruc || empresaId}_${anio}.pdf`);
  } catch (err) { next(err); }
}

// GET /api/reportes/:empresaId/isr?anio=2025
async function reporteISR(req, res, next) {
  try {
    const { empresaId } = req.params;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();

    const [empresa, isr, anticipos] = await Promise.all([
      prisma.empresa.findUnique({ where: { id: empresaId } }),
      prisma.declaracionISR.findUnique({ where: { empresaId_anio: { empresaId, anio } } }),
      prisma.anticipo.findMany({ where: { empresaId, anio }, orderBy: { cuota: 'asc' } }),
    ]);

    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
    if (!isr) return res.status(404).json({ error: 'Sin declaración ISR para este año' });

    const usd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
    const fechaCorta = (f) => f ? new Date(f).toLocaleDateString('es-PA') : '—';
    const estadoColor = (e) => ({ PAGADA: '#16a34a', PRESENTADA: '#2563eb', BORRADOR: '#94a3b8', VENCIDA: '#dc2626' })[e] || '#1e293b';

    const rentaNeta = Number(isr.rentaNeta);
    const impMetA = Number(isr.impuestoMetodoA);
    const impMetB = Number(isr.impuestoMetodoB);
    const impCausado = Number(isr.impuestoCausado);
    const totPagadoAnt = anticipos.filter((a) => a.estado === 'PAGADA').reduce((s, a) => s + Number(a.monto), 0);
    const metodoPrev = impMetB > impMetA ? 'B — CAIR (4.67% ingresos brutos)' : 'A — (25% renta neta)';
    const saldoFinal = Math.max(0, impCausado - Number(isr.creditos) - totPagadoAnt);

    const tablaLayout = {
      hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
      vLineWidth: () => 0,
      hLineColor: (i) => (i === 0 || i === 1 ? '#1e3a5f' : '#e2e8f0'),
      fillColor: (i) => (i === 0 ? '#1e3a5f' : i % 2 === 0 ? '#f8fafc' : null),
    };

    const row = (label, valor, bold = false) => [
      { text: label, fontSize: 9, color: bold ? '#1e3a5f' : '#1e293b', bold, margin: [4, bold ? 4 : 3, 4, bold ? 4 : 3] },
      { text: valor, fontSize: 9, color: bold ? '#1e3a5f' : '#1e293b', bold, alignment: 'right', margin: [4, bold ? 4 : 3, 4, bold ? 4 : 3] },
    ];
    const spacer = [{ text: '', border: [false,false,false,false] }, { text: '', border: [false,false,false,false] }];
    const subHdr = (txt) => [{ text: txt, fontSize: 8, bold: true, color: '#94a3b8', margin: [4,2,4,0], border: [false,false,false,false], colSpan: 2 }, {}];

    const docDef = {
      pageSize: 'LETTER',
      pageMargins: [40, 40, 40, 50],
      footer: (page, pages) => ({
        columns: [
          { text: `Gestar Tax — ${empresa.nombre} — ISR ${anio}`, fontSize: 7, color: '#94a3b8', marginLeft: 40 },
          { text: `Pág. ${page} de ${pages}`, fontSize: 7, color: '#94a3b8', alignment: 'right', marginRight: 40 },
        ],
      }),
      content: [
        {
          columns: [
            { stack: [{ text: 'TAXGESTAR', fontSize: 18, bold: true, color: '#1e3a5f' }, { text: 'Gestión Tributaria de Panamá', fontSize: 8, color: '#94a3b8' }] },
            { stack: [
              { text: 'DECLARACIÓN ISR ANUAL', fontSize: 14, bold: true, color: '#1e3a5f', alignment: 'right' },
              { text: empresa.nombre, fontSize: 11, bold: true, alignment: 'right' },
              { text: `RUC: ${empresa.ruc || '—'}  |  Año Fiscal: ${anio}`, fontSize: 8, color: '#94a3b8', alignment: 'right' },
            ]},
          ],
          marginBottom: 10,
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#1e3a5f' }] },
        { text: `Generado el ${fechaCorta(new Date())}`, fontSize: 7, color: '#94a3b8', italics: true, marginTop: 4, marginBottom: 16 },
        { text: `Declaración del Impuesto sobre la Renta — Año Fiscal ${anio}. Método aplicable: ${metodoPrev}.`, fontSize: 9, color: '#475569', marginBottom: 12 },

        { text: 'Cálculo del Impuesto', fontSize: 11, bold: true, color: '#1e3a5f', marginBottom: 6, decoration: 'underline' },
        {
          table: {
            widths: ['*', 150],
            body: [
              row('Ingresos Brutos', usd(isr.ingresosBrutos)),
              row('(-) Gastos Deducibles', usd(isr.gastos)),
              row('(=) Renta Neta Gravable', usd(rentaNeta), true),
              spacer,
              subHdr('MÉTODO A — 25% sobre Renta Neta'),
              row('Impuesto Método A', usd(impMetA)),
              spacer,
              subHdr('MÉTODO B — CAIR 4.67% sobre Ingresos Brutos'),
              row('Impuesto Método B (CAIR)', usd(impMetB)),
              spacer,
              row(`Método Aplicable: ${metodoPrev}`, '', true),
              row('Impuesto Causado', usd(impCausado), true),
              row('(-) Créditos Fiscales', usd(isr.creditos)),
              row('(-) Anticipos Pagados', usd(totPagadoAnt)),
              row('(=) SALDO A PAGAR', usd(saldoFinal), true),
            ],
          },
          layout: tablaLayout,
        },

        { text: 'Estado de Anticipos ISR', fontSize: 11, bold: true, color: '#1e3a5f', marginTop: 16, marginBottom: 6, decoration: 'underline' },
        anticipos.length > 0
          ? {
              table: {
                headerRows: 1,
                widths: [80, '*', 100, 80, 80],
                body: [
                  [
                    { text: 'Cuota', fontSize: 8, bold: true, color: '#ffffff', margin: [4,5,4,5] },
                    { text: 'Vencimiento', fontSize: 8, bold: true, color: '#ffffff', margin: [4,5,4,5] },
                    { text: 'Monto', fontSize: 8, bold: true, color: '#ffffff', alignment: 'right', margin: [4,5,4,5] },
                    { text: 'Estado', fontSize: 8, bold: true, color: '#ffffff', alignment: 'center', margin: [4,5,4,5] },
                    { text: 'Fecha Pago', fontSize: 8, bold: true, color: '#ffffff', alignment: 'center', margin: [4,5,4,5] },
                  ],
                  ...anticipos.map((a) => [
                    { text: a.cuota.replace('_', ' '), fontSize: 8, margin: [4,4,4,4] },
                    { text: fechaCorta(a.fechaVencimiento), fontSize: 8, margin: [4,4,4,4] },
                    { text: usd(a.monto), fontSize: 8, alignment: 'right', margin: [4,4,4,4] },
                    { text: a.estado, fontSize: 8, alignment: 'center', color: estadoColor(a.estado), margin: [4,4,4,4] },
                    { text: a.fechaPago ? fechaCorta(a.fechaPago) : '—', fontSize: 8, alignment: 'center', margin: [4,4,4,4] },
                  ]),
                ],
              },
              layout: tablaLayout,
            }
          : { text: 'Sin anticipos registrados para este año.', fontSize: 9, color: '#94a3b8', italics: true },

        {
          columns: [
            { stack: [{ text: 'Renta Neta', fontSize: 8, color: '#64748b', marginBottom: 2 }, { text: usd(rentaNeta), fontSize: 11, bold: true, color: rentaNeta < 0 ? '#dc2626' : '#1e3a5f' }], fillColor: '#f1f5f9', margin: [8,6,8,6] },
            { stack: [{ text: 'Imp. Causado', fontSize: 8, color: '#64748b', marginBottom: 2 }, { text: usd(impCausado), fontSize: 11, bold: true, color: '#1e3a5f' }], fillColor: '#f1f5f9', margin: [8,6,8,6] },
            { stack: [{ text: 'Anticipos', fontSize: 8, color: '#64748b', marginBottom: 2 }, { text: usd(totPagadoAnt), fontSize: 11, bold: true, color: '#16a34a' }], fillColor: '#f1f5f9', margin: [8,6,8,6] },
            { stack: [{ text: 'Saldo Final', fontSize: 8, color: '#64748b', marginBottom: 2 }, { text: usd(saldoFinal), fontSize: 11, bold: true, color: saldoFinal > 0 ? '#dc2626' : '#16a34a' }], fillColor: '#f1f5f9', margin: [8,6,8,6] },
          ],
          columnGap: 8,
          marginTop: 16,
        },
      ],
      styles: estilosBase(),
    };

    await enviarPdf(res, docDef, `isr_${empresa.ruc || empresaId}_${anio}.pdf`);
  } catch (err) { next(err); }
}

// GET /api/reportes/:empresaId/posicion?anio=2025
async function reportePosicionFiscal(req, res, next) {
  try {
    const { empresaId } = req.params;
    const hoy = new Date();
    const anio = parseInt(req.query.anio) || hoy.getFullYear();
    const mes = hoy.getMonth() + 1;

    const [empresa, itbmsAnual, isrAnio, anticiposAnio, obligacionesVencidas, obligacionesMes] = await Promise.all([
      prisma.empresa.findUnique({ where: { id: empresaId } }),
      prisma.declaracionITBMS.findMany({ where: { empresaId, anio }, orderBy: { mes: 'asc' } }),
      prisma.declaracionISR.findUnique({ where: { empresaId_anio: { empresaId, anio } } }),
      prisma.anticipo.findMany({ where: { empresaId, anio }, orderBy: { cuota: 'asc' } }),
      prisma.obligacionFiscal.findMany({ where: { empresaId, estado: 'VENCIDA' }, orderBy: { proximoVencimiento: 'asc' }, take: 10 }),
      prisma.obligacionFiscal.findMany({
        where: {
          empresaId,
          proximoVencimiento: { gte: hoy, lte: new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000) },
          estado: { in: ['PENDIENTE', 'VENCIDA'] },
        },
        orderBy: { proximoVencimiento: 'asc' },
        take: 10,
      }),
    ]);

    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const usd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
    const fechaCorta = (f) => f ? new Date(f).toLocaleDateString('es-PA') : '—';
    const MESES_NOM = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const itbmsResumen = itbmsAnual.reduce(
      (acc, d) => ({
        totalVentas: acc.totalVentas + Number(d.totalVentas),
        totalDebito: acc.totalDebito + Number(d.itbmsDebito),
        totalCredito: acc.totalCredito + Number(d.itbmsCredito) + Number(d.creditoMesAnterior || 0),
        impuestoPagado: acc.impuestoPagado + (d.estado === 'PAGADA' ? Number(d.saldo) : 0),
        impuestoPendiente: acc.impuestoPendiente + (d.estado === 'PRESENTADA' ? Number(d.saldo) : 0),
        declaradas: acc.declaradas + (d.estado !== 'BORRADOR' ? 1 : 0),
      }),
      { totalVentas: 0, totalDebito: 0, totalCredito: 0, impuestoPagado: 0, impuestoPendiente: 0, declaradas: 0 }
    );

    const anticipoResumen = {
      total: anticiposAnio.reduce((s, a) => s + Number(a.monto), 0),
      pagado: anticiposAnio.filter((a) => a.estado === 'PAGADA').reduce((s, a) => s + Number(a.monto), 0),
      pendiente: anticiposAnio.filter((a) => a.estado !== 'PAGADA').reduce((s, a) => s + Number(a.monto), 0),
      cuotasPagadas: anticiposAnio.filter((a) => a.estado === 'PAGADA').length,
    };

    const proximosConUrgencia = obligacionesMes.map((obl) => {
      const dias = Math.round((new Date(obl.proximoVencimiento) - hoy) / (1000 * 60 * 60 * 24));
      return { ...obl, diasRestantes: dias, urgencia: dias <= 1 ? 'CRITICA' : dias <= 7 ? 'ALTA' : dias <= 15 ? 'MEDIA' : 'NORMAL' };
    });

    const urgenciaColor = (u) => ({ CRITICA: '#dc2626', ALTA: '#d97706', MEDIA: '#0284c7', NORMAL: '#16a34a' })[u] || '#1e293b';

    const tablaLayout = {
      hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
      vLineWidth: () => 0,
      hLineColor: (i) => (i === 0 || i === 1 ? '#1e3a5f' : '#e2e8f0'),
      fillColor: (i) => (i === 0 ? '#1e3a5f' : i % 2 === 0 ? '#f8fafc' : null),
    };

    const row = (label, valor, bold = false) => [
      { text: label, fontSize: 9, color: bold ? '#1e3a5f' : '#1e293b', bold, margin: [4, bold ? 4 : 3, 4, bold ? 4 : 3] },
      { text: valor, fontSize: 9, color: bold ? '#1e3a5f' : '#1e293b', bold, alignment: 'right', margin: [4, bold ? 4 : 3, 4, bold ? 4 : 3] },
    ];

    const content = [
      {
        columns: [
          { stack: [{ text: 'TAXGESTAR', fontSize: 18, bold: true, color: '#1e3a5f' }, { text: 'Gestión Tributaria de Panamá', fontSize: 8, color: '#94a3b8' }] },
          { stack: [
            { text: 'POSICIÓN FISCAL CONSOLIDADA', fontSize: 14, bold: true, color: '#1e3a5f', alignment: 'right' },
            { text: empresa.nombre, fontSize: 11, bold: true, alignment: 'right' },
            { text: `RUC: ${empresa.ruc || '—'}  |  ${MESES_NOM[mes - 1]} ${anio}`, fontSize: 8, color: '#94a3b8', alignment: 'right' },
          ]},
        ],
        marginBottom: 10,
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#1e3a5f' }] },
      { text: `Generado el ${fechaCorta(hoy)}`, fontSize: 7, color: '#94a3b8', italics: true, marginTop: 4, marginBottom: 16 },
      { text: 'Resumen ejecutivo del estado tributario a la fecha de generación.', fontSize: 9, color: '#475569', marginBottom: 12 },

      { text: 'ITBMS — Impuesto de Transferencia de Bienes', fontSize: 11, bold: true, color: '#1e3a5f', marginBottom: 6, decoration: 'underline' },
      {
        table: {
          widths: ['*', 150],
          body: [
            row('Total Ventas Anuales', usd(itbmsResumen.totalVentas)),
            row('Total Débito Fiscal', usd(itbmsResumen.totalDebito)),
            row('Total Crédito Fiscal', usd(itbmsResumen.totalCredito)),
            row('Meses Declarados', `${itbmsResumen.declaradas} de ${mes}`),
            row('Impuesto Pagado (año)', usd(itbmsResumen.impuestoPagado), true),
            row('Impuesto Pendiente de Pago', usd(itbmsResumen.impuestoPendiente), true),
          ],
        },
        layout: tablaLayout,
      },

      { text: 'ISR — Impuesto sobre la Renta', fontSize: 11, bold: true, color: '#1e3a5f', marginTop: 16, marginBottom: 6, decoration: 'underline' },
      isrAnio
        ? {
            table: {
              widths: ['*', 150],
              body: [
                row('Ingresos Brutos', usd(isrAnio.ingresosBrutos)),
                row('Renta Neta Gravable', usd(isrAnio.rentaNeta)),
                row('Impuesto Causado', usd(isrAnio.impuestoCausado), true),
                row('Anticipos Pagados', usd(anticipoResumen.pagado)),
                row('Saldo Estimado a Pagar', usd(Math.max(0, Number(isrAnio.impuestoCausado) - anticipoResumen.pagado)), true),
              ],
            },
            layout: tablaLayout,
          }
        : { text: 'Sin declaración ISR registrada para este año.', fontSize: 9, color: '#94a3b8', italics: true },

      { text: 'Anticipos ISR', fontSize: 11, bold: true, color: '#1e3a5f', marginTop: 16, marginBottom: 6, decoration: 'underline' },
      {
        table: {
          widths: ['*', 150],
          body: [
            row('Total Anticipos del Año', usd(anticipoResumen.total)),
            row('Pagados', usd(anticipoResumen.pagado), true),
            row('Pendientes', usd(anticipoResumen.pendiente)),
            row('Cuotas Completadas', `${anticipoResumen.cuotasPagadas} de 3`),
          ],
        },
        layout: tablaLayout,
      },
    ];

    if (obligacionesVencidas.length > 0) {
      content.push(
        { text: 'Obligaciones Vencidas', fontSize: 11, bold: true, color: '#dc2626', marginTop: 16, marginBottom: 6, decoration: 'underline' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 120, 100],
            body: [
              [
                { text: 'Obligación', fontSize: 8, bold: true, color: '#ffffff', margin: [4,5,4,5] },
                { text: 'Venció', fontSize: 8, bold: true, color: '#ffffff', alignment: 'center', margin: [4,5,4,5] },
                { text: 'Estado', fontSize: 8, bold: true, color: '#ffffff', alignment: 'center', margin: [4,5,4,5] },
              ],
              ...obligacionesVencidas.map((o) => [
                { text: o.nombre || o.tipo, fontSize: 8, margin: [4,4,4,4] },
                { text: fechaCorta(o.proximoVencimiento), fontSize: 8, alignment: 'center', color: '#dc2626', margin: [4,4,4,4] },
                { text: 'VENCIDA', fontSize: 8, alignment: 'center', color: '#dc2626', bold: true, margin: [4,4,4,4] },
              ]),
            ],
          },
          layout: tablaLayout,
        }
      );
    } else {
      content.push({ text: 'Sin obligaciones vencidas al día de hoy. ✓', fontSize: 9, color: '#16a34a', marginTop: 8, marginBottom: 4 });
    }

    if (proximosConUrgencia.length > 0) {
      content.push(
        { text: 'Próximos Vencimientos (30 días)', fontSize: 11, bold: true, color: '#1e3a5f', marginTop: 16, marginBottom: 6, decoration: 'underline' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 100, 60, 80],
            body: [
              [
                { text: 'Obligación', fontSize: 8, bold: true, color: '#ffffff', margin: [4,5,4,5] },
                { text: 'Vence', fontSize: 8, bold: true, color: '#ffffff', alignment: 'center', margin: [4,5,4,5] },
                { text: 'Días', fontSize: 8, bold: true, color: '#ffffff', alignment: 'center', margin: [4,5,4,5] },
                { text: 'Urgencia', fontSize: 8, bold: true, color: '#ffffff', alignment: 'center', margin: [4,5,4,5] },
              ],
              ...proximosConUrgencia.map((p) => [
                { text: p.nombre || p.tipo, fontSize: 8, margin: [4,4,4,4] },
                { text: fechaCorta(p.proximoVencimiento), fontSize: 8, alignment: 'center', margin: [4,4,4,4] },
                { text: `${p.diasRestantes}d`, fontSize: 8, alignment: 'center', color: urgenciaColor(p.urgencia), margin: [4,4,4,4] },
                { text: p.urgencia, fontSize: 8, alignment: 'center', color: urgenciaColor(p.urgencia), bold: p.urgencia === 'CRITICA', margin: [4,4,4,4] },
              ]),
            ],
          },
          layout: tablaLayout,
        }
      );
    }

    const docDef = { pageSize: 'LETTER', pageMargins: [40, 40, 40, 50], content, styles: estilosBase(),
      footer: (page, pages) => ({
        columns: [
          { text: `Gestar Tax — ${empresa.nombre} — Posición Fiscal ${anio}`, fontSize: 7, color: '#94a3b8', marginLeft: 40 },
          { text: `Pág. ${page} de ${pages}`, fontSize: 7, color: '#94a3b8', alignment: 'right', marginRight: 40 },
        ],
      }),
    };

    await enviarPdf(res, docDef, `posicion_fiscal_${empresa.ruc || empresaId}_${anio}.pdf`);
  } catch (err) { next(err); }
}

function estilosBase() {
  return {
    thTabla: { fontSize: 8, bold: true, color: '#ffffff', margin: [4,5,4,5] },
    tdTabla: { fontSize: 8, color: '#1e293b', margin: [4,4,4,4] },
    tdTotal: { fontSize: 8, bold: true, color: '#1e3a5f', margin: [4,5,4,5] },
    tdTotalLabel: { fontSize: 8, bold: true, color: '#1e3a5f', margin: [4,5,4,5] },
  };
}

module.exports = { reporteITBMS, reporteISR, reportePosicionFiscal };
