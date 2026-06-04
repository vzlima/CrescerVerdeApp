const User = require('../models/User');

const ALLOWED_UPDATE_FIELDS = ['name', 'email', 'role', 'plan', 'isMinor', 'guardianEmail', 'sessionTimeLimitMinutes', 'guardianOf'];

module.exports = {
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

  async get(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).send({ error: 'Usuário não encontrado' });
      return res.send({ user });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao buscar usuário' });
    }
  },

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

  async changePassword(req, res) {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).send({ error: 'A senha deve ter pelo menos 6 caracteres.' });
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

  async delete(req, res) {
    try {
      await User.findByIdAndDelete(req.params.id);
      return res.send({ message: 'Usuário removido com sucesso' });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao deletar usuário' });
    }
  },

  async guardianView(req, res) {
    try {
      const guardian = await User.findById(req.params.id);
      if (!guardian) return res.status(404).send({ error: 'Usuário não encontrado' });

      const isGuardian = req.user.role === 'admin' || req.user.id === req.params.id;
      if (!isGuardian) return res.status(403).send({ error: 'Acesso negado' });

      const minors = await User.find({ _id: { $in: guardian.guardianOf || [] } });
      return res.send({ minors });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao buscar menores vinculados' });
    }
  },

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
