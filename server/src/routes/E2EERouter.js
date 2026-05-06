const express = require('express');
const router = express.Router();
const e2eeController = require('../controllers/E2EEController');

router.get('/keys', e2eeController.getKeys);
router.get('/conversation-key/:conv_id/:key_version', e2eeController.getConversationKey);
router.get('/conversation-keys', e2eeController.getConversationKeys);
router.get('/latest-conversation-key/:conv_id', e2eeController.getLatestConversationKey);

router.post('/get/public-keys', e2eeController.getPublicKeys);
router.post('/setup', e2eeController.setupKeys);
router.post('/conversation-keys', e2eeController.addConversationKeys);

module.exports = router;
