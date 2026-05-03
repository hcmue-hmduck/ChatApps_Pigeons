const express = require('express');
const router = express.Router();

const sheetController = require('../controllers/sheetController');


router.get('/', sheetController.getSheet);
router.post('/', sheetController.createSheet);

module.exports = router;