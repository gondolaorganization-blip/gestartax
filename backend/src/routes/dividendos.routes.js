const express = require('express');
const router  = express.Router({ mergeParams: true });
const ctrl    = require('../controllers/dividendos.controller');
const { authMiddleware, empresaAccessMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.use('/:empresaId', empresaAccessMiddleware);

router.get( '/:empresaId',     ctrl.listar);
router.post('/:empresaId',     ctrl.crear);
router.put( '/:empresaId/:id', ctrl.actualizar);

module.exports = router;
