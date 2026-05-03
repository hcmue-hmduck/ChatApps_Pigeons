const express = require('express');
const router = express.Router();

const openAiController = require('../controllers/openAiController');

// router.get('/', openAiController.sendMessageToAI);
router.post('/', openAiController.sendMessageToAI);

module.exports = router; 