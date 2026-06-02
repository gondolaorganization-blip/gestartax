const express = require('express');
const { body } = require('express-validator');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/itbms.controller');
const { authMiddleware, empresaAccessMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.use('/:empresaId', empresaAccessMiddleware);

const validarDeclaracion = [
  body('mes').isInt({ min: 1, max: 12 }).withMessage('Mes inválido'),
  body('anio').isInt({ min: 2020, max: 2100 }).withMessage('Año inválido'),
  body('ventasGravadas7').optional().isFloat({ min: 0 }).withMessage('Monto inválido'),
  body('ventasGravadas10').optional().isFloat({ min: 0 }).withMessage('Monto inválido'),
  body('ventasGravadas15').optional().isFloat({ min: 0 }).withMessage('Monto inválido'),
  body('ventasExentas').optional().isFloat({ min: 0 }).withMessage('Monto inválido'),
  body('itbmsCredito').optional().isFloat({ min: 0 }).withMessage('Monto inválido'),
];

router.get('/:empresaId',                       ctrl.listar);
router.get('/:empresaId/resumen',               ctrl.resumenAnual);
router.get('/:empresaId/periodo/:periodo',      ctrl.obtenerPorPeriodo);
router.get('/:empresaId/:id',                   ctrl.obtener);
router.post('/:empresaId/calcular',             ctrl.calcularPreview);
router.post('/:empresaId', validarDeclaracion,  ctrl.crear);
router.put('/:empresaId/:id', validarDeclaracion, ctrl.actualizar);

module.exports = router;
