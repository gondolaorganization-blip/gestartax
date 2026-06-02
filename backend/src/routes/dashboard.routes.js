const express = require('express');
const router = express.Router();
const { obtener } = require('../controllers/dashboard.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const prisma = require('../utils/prisma');

router.use(authMiddleware);

// Verificación de acceso inline (no usa mergeParams)
async function verificarAcceso(req, res, next) {
  const { empresaId } = req.params;
  const acceso = await prisma.empresaUsuario.findUnique({
    where: { empresaId_usuarioId: { empresaId, usuarioId: req.usuario.id } },
  }).catch(() => null);

  if (!acceso && req.usuario.rol !== 'ADMIN') {
    return res.status(403).json({ error: 'Sin acceso a esta empresa' });
  }
  next();
}

router.get('/:empresaId', verificarAcceso, obtener);

module.exports = router;
