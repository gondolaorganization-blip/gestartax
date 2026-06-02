const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

function generarTokens(userId) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
}

async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const { email, password, nombre } = req.body;

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) return res.status(409).json({ error: 'El correo ya está registrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuario.create({
      data: { email, passwordHash, nombre, rol: 'CONTADOR' },
      select: { id: true, email: true, nombre: true, rol: true },
    });

    const tokens = generarTokens(usuario.id);
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        usuarioId: usuario.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({ usuario, ...tokens });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const { email, password } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        empresas: {
          include: {
            empresa: { select: { id: true, nombre: true, ruc: true, regimen: true } },
          },
        },
      },
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(password, usuario.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const tokens = generarTokens(usuario.id);
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        usuarioId: usuario.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const { passwordHash, ...usuarioSafe } = usuario;
    res.json({ usuario: usuarioSafe, ...tokens });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token requerido' });

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const tokens = generarTokens(payload.userId);

    // Rotar el refresh token
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        usuarioId: payload.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Refresh token inválido' });
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ mensaje: 'Sesión cerrada correctamente' });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        createdAt: true,
        empresas: {
          include: {
            empresa: {
              select: {
                id: true,
                nombre: true,
                ruc: true,
                dv: true,
                regimen: true,
                esGranContribuyente: true,
                actividadEconomica: true,
              },
            },
          },
        },
      },
    });
    res.json(usuario);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, me };
