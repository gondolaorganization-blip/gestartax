const express = require('express');
const router = express.Router({ mergeParams: true });
const { listar, crear, actualizar, generarCuotas, pagarCuota } = require('../controllers/inmueble.controller');
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

router.get('/',                                    verificarAcceso, listar);
router.post('/',                                   verificarAcceso, crear);
router.put('/:id',                                 verificarAcceso, actualizar);
router.post('/:id/cuotas/generar',                 verificarAcceso, generarCuotas);
router.put('/:propiedadId/cuotas/:cuotaId/pagar',  verificarAcceso, pagarCuota);

module.exports = router;
