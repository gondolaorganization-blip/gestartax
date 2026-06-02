const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/alerta.controller');
const { authMiddleware, empresaAccessMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.use('/:empresaId', empresaAccessMiddleware);

router.get('/:empresaId',                          ctrl.listar);
router.get('/:empresaId/conteo',                   ctrl.conteo);
router.post('/:empresaId',                         ctrl.crearManual);
router.patch('/:empresaId/todas-leidas',           ctrl.marcarTodasLeidas);
router.patch('/:empresaId/:alertaId/leida',        ctrl.marcarLeida);
router.patch('/:empresaId/:alertaId/archivar',     ctrl.archivar);

module.exports = router;
