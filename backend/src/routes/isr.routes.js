const express = require('express');
const { body } = require('express-validator');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/isr.controller');
const { authMiddleware, empresaAccessMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.use('/:empresaId', empresaAccessMiddleware);

const validarDeclaracion = [
  body('anio').isInt({ min: 2020, max: 2100 }).withMessage('Año inválido'),
  body('ingresosBrutos').isFloat({ min: 0 }).withMessage('Ingresos brutos inválidos'),
  body('gastosDeducibles').optional().isFloat({ min: 0 }).withMessage('Gastos inválidos'),
];

router.get('/:empresaId',                      ctrl.listar);
router.get('/:empresaId/proyeccion',           ctrl.proyeccionCierre);
router.get('/:empresaId/:id',                  ctrl.obtener);
router.post('/:empresaId/calcular',            ctrl.calcularPreview);
router.post('/:empresaId', validarDeclaracion, ctrl.crear);
router.put('/:empresaId/:id',                  ctrl.actualizar);

module.exports = router;
