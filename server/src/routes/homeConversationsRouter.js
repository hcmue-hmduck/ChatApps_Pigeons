const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');

// Conversation routes
router.get('/:userID', homeController.getHomeConversation);
router.put('/:convID', homeController.putHomeConversation);
router.post('/', homeController.createConversation);
router.get('/name/:convID', homeController.getConversationNameById);

module.exports = router;