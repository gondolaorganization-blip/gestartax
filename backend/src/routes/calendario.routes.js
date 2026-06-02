const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/calendario.controller');
const { authMiddleware, empresaAccessMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.use('/:empresaId', empresaAccessMiddleware);

router.post('/:empresaId/generar', ctrl.generar);
router.get('/:empresaId/anual', ctrl.obtenerAnual);
router.get('/:empresaId/mes/:mes', ctrl.obtenerMes);
router.get('/:empresaId/proximos', ctrl.proximosVencimientos);
router.get('/:empresaId/preview', ctrl.previewCalendario);

module.exports = router;
