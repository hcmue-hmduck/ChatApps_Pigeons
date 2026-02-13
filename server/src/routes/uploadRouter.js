const express = require('express');
const router = express.Router();
const upload = require('../configs/multerConfig');
const uploadController = require('../controllers/uploadController');


router.post('/:convID', upload.any(), uploadController.uploadFile);




module.exports = router;