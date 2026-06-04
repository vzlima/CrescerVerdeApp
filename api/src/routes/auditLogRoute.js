const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getByUser, getSummaryByUser } = require('../controllers/auditLogController');

router.use(authMiddleware);
router.get('/:userId/logs',    getByUser);
router.get('/:userId/summary', getSummaryByUser);

module.exports = router;
