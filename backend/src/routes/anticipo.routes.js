const express = require('express');
const { body } = require('express-validator');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/anticipo.controller');
const { authMiddleware, empresaAccessMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.use('/:empresaId', empresaAccessMiddleware);

router.get('/:empresaId',                              ctrl.listar);
router.get('/:empresaId/resumen',                      ctrl.resumenAnual);
router.post('/:empresaId/generar',                     ctrl.generarAnticipos);
router.post('/:empresaId/:anticipoId/pago',            ctrl.registrarPago);
router.put('/:empresaId/:anticipoId',                  ctrl.actualizar);

module.exports = router;
