const User = require('../models/User');
const bcrypt = require('bcryptjs');
const CourseProgress = require('../models/CourseProgress');
const Certificate = require('../models/Certificate');
const { logEvent } = require('./auditLogController');

const ALLOWED_UPDATE_FIELDS = ['name', 'email', 'role', 'plan', 'isMinor', 'guardianEmail', 'sessionTimeLimitMinutes', 'guardianOf'];
const SELF_UPDATE_FIELDS    = ['name', 'email'];

async function cascadeDeleteUser(userId) {
  await Promise.all([
    CourseProgress.deleteMany({ userId }),
    Certificate.deleteMany({ user: userId }),
    User.updateMany({ guardianOf: userId }, { $pull: { guardianOf: userId } }),
  ]);
}

module.exports = {
  // ── Admin: criar usuário ────────────────────────────────
  async create(req, res) {
    try {
      const { email } = req.body;
      if (await User.findOne({ email })) {
        return res.status(400).send({ error: 'Usuário já existe' });
      }
      const user = await User.create({
        ...req.body,
        acceptedTerms: true,
        acceptedTermsAt: new Date(),
      });
      user.password = undefined;
      return res.status(201).send({ user });
    } catch (err) {
      return res.status(400).send({ error: 'Falha no registro' });
    }
  },

  // ── Admin: listar usuários ──────────────────────────────
  async list(req, res) {
    try {
      const skip  = parseInt(req.query.skip)  || 0;
      const limit = parseInt(req.query.limit) || 200;
      const users = await User.find().skip(skip).limit(limit).lean();
      const total = await User.countDocuments();
      return res.send({ users, total, skip, limit });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao listar usuários' });
    }
  },

  // ── Admin: buscar por ID ────────────────────────────────
  async get(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).send({ error: 'Usuário não encontrado' });
      return res.send({ user });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao buscar usuário' });
    }
  },

  // ── Admin: atualizar por ID ─────────────────────────────
  async update(req, res) {
    try {
      const safeBody = {};
      for (const key of ALLOWED_UPDATE_FIELDS) {
        if (req.body[key] !== undefined) safeBody[key] = req.body[key];
      }
      const user = await User.findByIdAndUpdate(req.params.id, safeBody, { new: true });
      return res.send({ user });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao atualizar usuário' });
    }
  },

  // ── Admin: trocar senha de outro usuário ────────────────
  async changePassword(req, res) {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).send({ error: 'A senha deve ter pelo menos 8 caracteres.' });
      }
      const user = await User.findById(req.params.id).select('+password');
      if (!user) return res.status(404).send({ error: 'Usuário não encontrado' });
      user.password = newPassword;
      await user.save();
      return res.send({ message: 'Senha alterada com sucesso.' });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao alterar senha' });
    }
  },

  // ── Admin: deletar com cascade ──────────────────────────
  async delete(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).send({ error: 'Usuário não encontrado' });
      logEvent(user._id, 'account_deleted', { email: user.email, deletedBy: 'admin' });
      await cascadeDeleteUser(req.params.id);
      await User.findByIdAndDelete(req.params.id);
      return res.send({ message: 'Usuário removido com sucesso' });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao deletar usuário' });
    }
  },

  // ── Self-service: meu perfil ────────────────────────────
  async getMe(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).send({ error: 'Usuário não encontrado' });
      return res.send({ user });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao buscar perfil' });
    }
  },

  // ── Self-service: atualizar meu perfil ─────────────────
  async updateMe(req, res) {
    try {
      const safeBody = {};
      for (const key of SELF_UPDATE_FIELDS) {
        if (req.body[key] !== undefined) safeBody[key] = req.body[key];
      }
      if (safeBody.email) {
        const exists = await User.findOne({ email: safeBody.email, _id: { $ne: req.user.id } });
        if (exists) return res.status(400).send({ error: 'E-mail já em uso.' });
      }
      const user = await User.findByIdAndUpdate(req.user.id, safeBody, { new: true });
      return res.send({ user });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao atualizar perfil' });
    }
  },

  // ── Self-service: trocar minha senha ───────────────────
  async changeMyPassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).send({ error: 'Dados incompletos.' });
      }
      if (newPassword.length < 8) {
        return res.status(400).send({ error: 'A senha deve ter pelo menos 8 caracteres.' });
      }
      const user = await User.findById(req.user.id).select('+password');
      if (!user) return res.status(404).send({ error: 'Usuário não encontrado' });
      const ok = await bcrypt.compare(currentPassword, user.password);
      if (!ok) return res.status(400).send({ error: 'Senha atual incorreta.' });
      user.password = newPassword;
      await user.save();
      logEvent(req.user.id, 'password_changed', {});
      return res.send({ message: 'Senha alterada com sucesso.' });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao alterar senha' });
    }
  },

  // ── Self-service: deletar minha conta (LGPD) ───────────
  async deleteMe(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).send({ error: 'Usuário não encontrado' });
      logEvent(user._id, 'account_deleted', { email: user.email, deletedBy: 'self' });
      await cascadeDeleteUser(req.user.id);
      await User.findByIdAndDelete(req.user.id);
      return res.send({ message: 'Conta removida com sucesso.' });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao deletar conta' });
    }
  },

  // ── Guardian: ver menores vinculados ───────────────────
  async guardianView(req, res) {
    try {
      const guardian = await User.findById(req.params.id);
      if (!guardian) return res.status(404).send({ error: 'Usuário não encontrado' });
      const isAuthorized = req.user.role === 'admin' || req.user.id === req.params.id;
      if (!isAuthorized) return res.status(403).send({ error: 'Acesso negado' });
      const minors = await User.find({ _id: { $in: guardian.guardianOf || [] } });
      return res.send({ minors });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao buscar menores vinculados' });
    }
  },

  // ── Guardian: definir limite de sessão ─────────────────
  async setTimeLimit(req, res) {
    try {
      const { sessionTimeLimitMinutes } = req.body;
      const target = await User.findById(req.params.id);
      if (!target) return res.status(404).send({ error: 'Usuário não encontrado' });
      const guardian = await User.findById(req.user.id);
      const isAuthorized =
        req.user.role === 'admin' ||
        (guardian && guardian.guardianOf && guardian.guardianOf.map(String).includes(req.params.id));
      if (!isAuthorized) return res.status(403).send({ error: 'Acesso negado' });
      const updated = await User.findByIdAndUpdate(
        req.params.id,
        { sessionTimeLimitMinutes },
        { new: true }
      );
      return res.send({ user: updated });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao definir limite de tempo' });
    }
  },
};
