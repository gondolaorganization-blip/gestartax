const express = require('express');
const router  = express.Router({ mergeParams: true });
const ctrl    = require('../controllers/planilla.controller');
const { authMiddleware, empresaAccessMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.use('/:empresaId', empresaAccessMiddleware);

// Empleados
router.get( '/:empresaId/empleados',        ctrl.listarEmpleados);
router.post('/:empresaId/empleados',        ctrl.crearEmpleado);
router.put( '/:empresaId/empleados/:id',    ctrl.actualizarEmpleado);

// Planilla
router.get( '/:empresaId/periodos',         ctrl.listarPeriodos);
router.get( '/:empresaId/periodos/:id',     ctrl.obtenerPeriodo);
router.post('/:empresaId/periodos',         ctrl.crearPeriodo);
router.patch('/:empresaId/periodos/:id/estado', ctrl.cambiarEstado);

module.exports = router;
