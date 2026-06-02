const express = require('express');
const router  = express.Router({ mergeParams: true });
const ctrl    = require('../controllers/municipal.controller');
const { authMiddleware, empresaAccessMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.use('/:empresaId', empresaAccessMiddleware);

router.get( '/:empresaId',                                    ctrl.listarObligaciones);
router.post('/:empresaId',                                    ctrl.crearObligacion);
router.put( '/:empresaId/:id',                                ctrl.actualizarObligacion);
router.post('/:empresaId/:obligacionId/pagos',                ctrl.crearPago);
router.patch('/:empresaId/:obligacionId/pagos/:pagoId/pagar', ctrl.registrarPago);

module.exports = router;
