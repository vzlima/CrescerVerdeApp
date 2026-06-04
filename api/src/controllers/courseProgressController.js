const CourseProgress = require('../models/CourseProgress');
const { logEvent } = require('./auditLogController');

const resolveUserId = (req) =>
  req.user.role === 'admin' ? (req.body.userId || req.user.id) : req.user.id;

module.exports = {
  async addContent(req, res) {
    try {
      const { courseId, contentId } = req.body;
      const userId = resolveUserId(req);
      const courseProgress = await CourseProgress.findOneAndUpdate(
        { userId, courseId },
        { $addToSet: { completedContents: contentId } },
        { new: true, upsert: true }
      );
      return res.send({ courseProgress });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao adicionar conteúdo ao progresso do curso' });
    }
  },

  async removeContent(req, res) {
    try {
      const { courseId, contentId } = req.body;
      const userId = resolveUserId(req);
      const courseProgress = await CourseProgress.findOneAndUpdate(
        { userId, courseId },
        { $pull: { completedContents: contentId } },
        { new: true, upsert: true }
      );
      return res.send({ courseProgress });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao remover conteúdo do progresso do curso' });
    }
  },

  async update(req, res) {
    try {
      const { courseId, isCourseCompleted } = req.body;
      const userId = resolveUserId(req);
      const courseProgress = await CourseProgress.findOneAndUpdate(
        { userId, courseId },
        { isCourseCompleted },
        { new: true, upsert: true }
      );
      if (isCourseCompleted) {
        logEvent(userId, 'course_complete', { courseId });
      }
      return res.send({ courseProgress });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao atualizar progresso do curso' });
    }
  },

  async get(req, res) {
    try {
      const { courseId } = req.body;
      const userId = resolveUserId(req);
      const courseProgress = await CourseProgress.findOne({ userId, courseId });
      return res.send({ courseProgress });
    } catch (err) {
      return res.status(400).send({ error: 'Erro ao buscar progresso do curso' });
    }
  },

  // Registra abertura de trilha — fire-and-forget pelo frontend
  async open(req, res) {
    try {
      const { courseId } = req.body;
      if (courseId) logEvent(req.user.id, 'course_open', { courseId });
      return res.send({ ok: true });
    } catch (err) {
      return res.send({ ok: false });
    }
  },
};
