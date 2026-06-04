const AuditLog = require('../models/AuditLog');

// Helper interno — nunca lança exceção para não quebrar o fluxo principal
async function logEvent(userId, action, meta = {}, sessionDuration = null) {
  try {
    await AuditLog.create({ userId, action, meta, sessionDuration });
  } catch (_) {}
}

// GET /api/audit/:userId/logs — admin ou o próprio usuário
async function getByUser(req, res) {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const logs = await AuditLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ logs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// GET /api/audit/:userId/summary — resumo para painel parental
async function getSummaryByUser(req, res) {
  try {
    const { userId } = req.params;

    // Permite admin ou o próprio guardião (validação simplificada — guardian já
    // tem permissão via guardianView; aqui só bloqueamos terceiros)
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      // Verifica se é guardião do aluno
      const User = require('../models/User');
      const guardian = await User.findById(req.user.id).lean();
      const isGuardian = guardian &&
        Array.isArray(guardian.guardianOf) &&
        guardian.guardianOf.map(String).includes(userId);
      if (!isGuardian) return res.status(403).json({ error: 'Acesso negado' });
    }

    const logs = await AuditLog.find({ userId }).lean();

    const sessions = logs.filter(l => l.action === 'login');
    const logouts  = logs.filter(l => l.action === 'logout');
    const opens    = logs.filter(l => l.action === 'course_open');
    const completes = logs.filter(l => l.action === 'course_complete');
    const certs    = logs.filter(l => l.action === 'certificate_issued');

    const totalMinutes = logouts.reduce((sum, l) => sum + (l.sessionDuration || 0), 0);

    const lastLogin = sessions.length
      ? sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt
      : null;

    // Trilhas únicas abertas
    const uniqueOpened = [...new Set(opens.map(l => String(l.meta?.courseId)).filter(Boolean))];

    return res.json({
      totalSessions: sessions.length,
      totalMinutes,
      completedTrails: completes.length,
      certificates: certs.length,
      lastSeen: lastLogin,
      trailsOpened: uniqueOpened.length,
      recentActivity: logs
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(l => ({ action: l.action, meta: l.meta, createdAt: l.createdAt })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { logEvent, getByUser, getSummaryByUser };
