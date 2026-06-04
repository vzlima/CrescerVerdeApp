const authRoutes = require('./authRoutes');
const courseRoutes = require('./courseRoutes');
const userRoutes = require('./userRoutes');
const courseContentRoutes = require('./courseContentRoute');
const courseProgressRoutes = require('./courseProgressRoute');
const certificateRoutes = require('./certificateRoute');
const auditLogRoutes = require('./auditLogRoute');

module.exports = {
  authRoutes,
  courseRoutes,
  userRoutes,
  courseContentRoutes,
  courseProgressRoutes,
  certificateRoutes,
  auditLogRoutes,
};