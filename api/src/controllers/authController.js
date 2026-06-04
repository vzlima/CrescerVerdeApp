const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { logEvent } = require('./auditLogController');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const register = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();
    const role = req.body.role === 'guardian' ? 'guardian' : 'user';
    const guardianEmail = (req.body.guardianEmail || '').trim().toLowerCase();

    if (!name) return res.status(400).json({ message: 'Nome é obrigatório.' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'E-mail inválido.' });
    if (password.length < 8) return res.status(400).json({ message: 'A senha deve ter pelo menos 8 caracteres.' });

    // Aluno deve informar e-mail do responsável
    if (role === 'user' && !EMAIL_RE.test(guardianEmail)) {
      return res.status(400).json({ message: 'E-mail do responsável é obrigatório para alunos.' });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'E-mail já cadastrado.' });
    }

    const userData = {
      name,
      email,
      password,
      role,
      acceptedTerms: true,
      acceptedTermsAt: new Date(),
    };

    if (role === 'user') {
      userData.isMinor = true;
      userData.guardianEmail = guardianEmail;
    }

    await User.create(userData);

    res.status(201).json({ message: 'Usuário criado com sucesso.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();

    if (!EMAIL_RE.test(email) || !password) {
      return res.status(400).json({ message: 'Dados inválidos.' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '4h' });

    logEvent(user._id, 'login', { ip: req.ip });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan || 'free',
        isMinor: user.isMinor || false,
        sessionTimeLimitMinutes: user.sessionTimeLimitMinutes || null,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'E-mail inválido.' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: 'Se este e-mail estiver cadastrado, você receberá as instruções.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });

    res.json({ message: 'Se este e-mail estiver cadastrado, você receberá as instruções.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'Dados incompletos.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'A senha deve ter pelo menos 8 caracteres.' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })
      .select('+resetPasswordToken +resetPasswordExpires +password');

    if (!user || user.resetPasswordToken !== token) {
      return res.status(400).json({ message: 'Token inválido ou expirado.' });
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: 'Token expirado. Solicite um novo link.' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Senha redefinida com sucesso! Você já pode fazer login.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { register, login, forgotPassword, resetPassword, logout };

const logout = async (req, res) => {
  try {
    const sessionDuration = parseInt(req.body?.sessionDuration) || null;
    // req.user é injetado pelo authMiddleware
    if (req.user?.id) {
      logEvent(req.user.id, 'logout', {}, sessionDuration);
    }
    res.json({ message: 'Logout registrado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
