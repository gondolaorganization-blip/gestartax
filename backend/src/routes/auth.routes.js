const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const validarRegistro = [
  body('email').isEmail().withMessage('Correo inválido'),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
];

const validarLogin = [
  body('email').isEmail().withMessage('Correo inválido'),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
];

router.post('/register', validarRegistro, ctrl.register);
router.post('/login', validarLogin, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', authMiddleware, ctrl.me);

module.exports = router;
