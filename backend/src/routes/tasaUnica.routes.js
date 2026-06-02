const express = require('express');
const router  = express.Router({ mergeParams: true });
const ctrl    = require('../controllers/tasaUnica.controller');
const { authMiddleware, empresaAccessMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.use('/:empresaId', empresaAccessMiddleware);

router.get(  '/:empresaId',              ctrl.listar);
router.post( '/:empresaId',              ctrl.crear);
router.post( '/:empresaId/generar',      ctrl.generarAnio);
router.patch('/:empresaId/:id/pago',     ctrl.registrarPago);

module.exports = router;
