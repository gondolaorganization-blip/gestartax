const express = require('express');
const router = express.Router();
const { reporteITBMS, reporteISR, reportePosicionFiscal } = require('../controllers/reporte.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const prisma = require('../utils/prisma');

router.use(authMiddleware);

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

router.get('/:empresaId/itbms',   verificarAcceso, reporteITBMS);
router.get('/:empresaId/isr',     verificarAcceso, reporteISR);
router.get('/:empresaId/posicion', verificarAcceso, reportePosicionFiscal);

module.exports = router;
