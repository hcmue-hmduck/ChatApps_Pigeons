const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController.js');
const {authentication} = require('../middlewares/authMiddleware.js');

// trên đây kh cần check auth, api dành cho bot server gọi

router.use(authentication);
router.get('/', botController.get);
router.get('/:bot_user_id', botController.getBotByUserId);
router.post('/:bot_user_id/webhook', botController.callWebhook);
router.post('/', botController.create);
router.put('/:bot_id', botController.update);
router.delete('/:bot_id', botController.delete);

module.exports = router;