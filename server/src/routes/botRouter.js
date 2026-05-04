const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController.js');
const {authentication} = require('../middlewares/authMiddleware.js');

// trên đây kh cần check auth, api dành cho bot server gọi

router.use(authentication);
router.post('/', botController.create);
router.put('/:bot_id', botController.update);

module.exports = router;