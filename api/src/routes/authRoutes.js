const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Muitas solicitações de recuperação. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Limite de cadastros atingido. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register',       registerLimiter, authController.register);
router.post('/login',          loginLimiter,    authController.login);
router.post('/forgot-password', forgotLimiter,  authController.forgotPassword);
router.post('/reset-password',                  authController.resetPassword);
router.post('/logout',         authMiddleware,  authController.logout);

module.exports = router;
