const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

router.use(authMiddleware);

// Self-service — deve vir ANTES de /:id para não ser capturado como param
router.get('/me',          userController.getMe);
router.put('/me',          userController.updateMe);
router.put('/me/password', userController.changeMyPassword);
router.delete('/me',       userController.deleteMe);

// Guardian — autorização própria no controller
router.get('/:id/guardian-view', userController.guardianView);
router.put('/:id/time-limit',    userController.setTimeLimit);

// Admin-only — adminMiddleware aplicado individualmente
router.post('/',            adminMiddleware, userController.create);
router.get('/',             adminMiddleware, userController.list);
router.get('/:id',          adminMiddleware, userController.get);
router.put('/:id',          adminMiddleware, userController.update);
router.put('/:id/password', adminMiddleware, userController.changePassword);
router.delete('/:id',       adminMiddleware, userController.delete);

module.exports = router;
