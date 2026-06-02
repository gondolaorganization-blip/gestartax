const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/empresa.controller');
const { authMiddleware, empresaAccessMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

const validarEmpresa = [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('ruc').notEmpty().withMessage('El RUC es requerido'),
  body('dv').notEmpty().withMessage('El dígito verificador es requerido'),
  body('regimen').optional().isIn(['GENERAL', 'REM', 'SEM', 'ZLC']).withMessage('Régimen inválido'),
];

router.get('/', ctrl.listar);
router.post('/', validarEmpresa, ctrl.crear);
router.get('/:id', empresaAccessMiddleware, ctrl.obtener);
router.put('/:id', empresaAccessMiddleware, validarEmpresa, ctrl.actualizar);
router.get('/:id/perfil-tributario', empresaAccessMiddleware, ctrl.perfilTributario);
router.post('/:id/usuarios', empresaAccessMiddleware, ctrl.agregarUsuario);

module.exports = router;
