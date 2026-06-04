const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  action: {
    type: String,
    enum: ['login', 'logout', 'course_open', 'course_complete', 'certificate_issued', 'account_deleted', 'password_changed'],
    required: true,
  },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  sessionDuration: { type: Number, default: null }, // minutos
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
