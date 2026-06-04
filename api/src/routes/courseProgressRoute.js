const express = require('express');
const router = express.Router();
const courseProgressController = require('../controllers/courseProgressController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/addContent',  courseProgressController.addContent);
router.post('/removeContent', courseProgressController.removeContent);
router.post('/update',      courseProgressController.update);
router.post('/get',         courseProgressController.get);
router.post('/open',        courseProgressController.open);

module.exports = router;
