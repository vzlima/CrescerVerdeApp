const Certificate = require('../models/Certificate');
const CourseProgress = require('../models/CourseProgress');
const { logEvent } = require('./auditLogController');

const create = async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (req.user.role !== 'admin' && req.user.id !== String(userId)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    if (await Certificate.findOne({ user: userId, course: courseId })) {
      return res.status(400).json({ message: 'Certificado já emitido' });
    }

    const courseProgress = await CourseProgress.findOne({ userId, courseId });

    if (!courseProgress || !courseProgress.isCourseCompleted) {
      return res.status(400).json({ message: 'Curso não concluído' });
    }

    const certificate = new Certificate({ user: userId, course: courseId });
    await certificate.save();

    logEvent(userId, 'certificate_issued', { courseId, certificateId: certificate._id });

    res.status(201).json(certificate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role !== 'admin' && req.user.id !== String(userId)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const certificates = await Certificate.find({ user: userId })
      .populate('course', 'title')
      .lean();

    const response = certificates.map(c => ({
      _id: c._id,
      courseId: c.course?._id,
      courseName: c.course?.title || 'Curso Indisponível',
      date: c.date || c.createdAt,
    }));
    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const get = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const certificate = await Certificate.findOne({ _id: certificateId })
      .populate('user', 'name')
      .populate('course', 'title');

    if (!certificate) return res.status(404).json({ message: 'Certificado não encontrado' });

    if (
      req.user.role !== 'admin' &&
      req.user.id !== String(certificate.user?._id)
    ) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    res.status(200).json(certificate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { create, getByUserId, get };
