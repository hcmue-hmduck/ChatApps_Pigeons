const express = require('express');
const router = express.Router();
const geminiController = require('../controllers/geminiController.js');

router.post('/generate', geminiController.generateGeminiResponse);

module.exports = router;