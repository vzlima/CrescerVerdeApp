const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

router.use(authMiddleware);

// Self-service — deve vir ANTES do /:id para não ser capturado como param
router.get('/me',          userController.getMe);
router.put('/me',          userController.updateMe);
router.put('/me/password', userController.changeMyPassword);
router.delete('/me',       userController.deleteMe);

// Guardian — própria autorização no controller
router.get('/:id/guardian-view', userController.guardianView);
router.put('/:id/time-limit',    userController.setTimeLimit);

// Admin-only
router.use(adminMiddleware);
router.post('/',              userController.create);
router.get('/',               userController.list);
router.get('/:id',            userController.get);
router.put('/:id',            userController.update);
router.put('/:id/password',   userController.changePassword);
router.delete('/:id',         userController.delete);

module.exports = router;
