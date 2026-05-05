const express = require('express');
const router = express.Router();
const e2eeController = require('../controllers/E2EEController.js')

router.post('/setup', e2eeController.setupKeys)

module.exports = router