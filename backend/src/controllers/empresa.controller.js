const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

async function listar(req, res, next) {
  try {
    const empresas = await prisma.empresaUsuario.findMany({
      where: { usuarioId: req.usuario.id },
      include: {
        empresa: true,
      },
    });
    res.json(empresas.map((eu) => eu.empresa));
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.params.id },
    });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(empresa);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const {
      nombre, ruc, dv, regimen, periodoFiscal,
      esGranContribuyente, actividadEconomica,
      direccion, telefono, email, representanteLegal,
    } = req.body;

    const existe = await prisma.empresa.findUnique({ where: { ruc } });
    if (existe) return res.status(409).json({ error: 'Ya existe una empresa con ese RUC' });

    const empresa = await prisma.empresa.create({
      data: {
        nombre, ruc, dv,
        regimen: regimen || 'GENERAL',
        periodoFiscal: periodoFiscal || 'ENERO-DICIEMBRE',
        esGranContribuyente: esGranContribuyente || false,
        actividadEconomica, direccion, telefono, email, representanteLegal,
      },
    });

    // Vincular al usuario que la crea como ADMIN de esa empresa
    await prisma.empresaUsuario.create({
      data: { empresaId: empresa.id, usuarioId: req.usuario.id, rol: 'ADMIN' },
    });

    res.status(201).json(empresa);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const empresa = await prisma.empresa.findUnique({ where: { id: req.params.id } });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const {
      nombre, dv, regimen, periodoFiscal,
      esGranContribuyente, actividadEconomica,
      direccion, telefono, email, representanteLegal,
    } = req.body;

    const actualizada = await prisma.empresa.update({
      where: { id: req.params.id },
      data: {
        nombre, dv, regimen, periodoFiscal,
        esGranContribuyente, actividadEconomica,
        direccion, telefono, email, representanteLegal,
      },
    });
    res.json(actualizada);
  } catch (err) {
    next(err);
  }
}

async function perfilTributario(req, res, next) {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.params.id },
      include: {
        obligaciones: {
          where: { estado: { in: ['PENDIENTE', 'VENCIDA'] } },
          orderBy: { proximoVencimiento: 'asc' },
          take: 5,
        },
        _count: {
          select: {
            declaracionesITBMS: true,
            declaracionesISR: true,
            alertas: { where: { leida: false } },
          },
        },
      },
    });

    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const hoy = new Date();
    const obligacionesVencidas = empresa.obligaciones.filter(
      (o) => o.proximoVencimiento < hoy && o.estado === 'PENDIENTE'
    );

    res.json({
      empresa,
      resumen: {
        alertasNoleidas: empresa._count.alertas,
        declaracionesITBMS: empresa._count.declaracionesITBMS,
        declaracionesISR: empresa._count.declaracionesISR,
        obligacionesVencidas: obligacionesVencidas.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function agregarUsuario(req, res, next) {
  try {
    const { email, rol } = req.body;
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const vinculo = await prisma.empresaUsuario.upsert({
      where: { empresaId_usuarioId: { empresaId: req.params.id, usuarioId: usuario.id } },
      update: { rol },
      create: { empresaId: req.params.id, usuarioId: usuario.id, rol: rol || 'CONTADOR' },
    });
    res.json(vinculo);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, perfilTributario, agregarUsuario };
