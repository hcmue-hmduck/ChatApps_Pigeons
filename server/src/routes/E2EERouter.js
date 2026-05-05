const express = require('express');
const router = express.Router();
const e2eeController = require('../controllers/E2EEController');

router.get('/get/keys', e2eeController.getKeys);
router.post('/setup', e2eeController.setupKeys);
router.post('/get/public-keys', e2eeController.getPublicKeys);
router.post('/shared-keys', e2eeController.addSharedKeys);
router.post('/get/shared-key', e2eeController.getSharedKey);
router.get('/get/shared-keys', e2eeController.getSharedKeys);

module.exports = router;
