const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, nombre: true, rol: true, activo: true },
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no autorizado' });
    }

    req.usuario = usuario;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

async function empresaAccessMiddleware(req, res, next) {
  const empresaId = req.params.empresaId || req.body.empresaId;
  if (!empresaId) return next();

  const acceso = await prisma.empresaUsuario.findUnique({
    where: { empresaId_usuarioId: { empresaId, usuarioId: req.usuario.id } },
  });

  if (!acceso && req.usuario.rol !== 'ADMIN') {
    return res.status(403).json({ error: 'Sin acceso a esta empresa' });
  }

  req.empresaId = empresaId;
  next();
}

module.exports = { authMiddleware, empresaAccessMiddleware };
