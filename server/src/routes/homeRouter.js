const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');

router.put('/userinfor/:userID', homeController.putUserInfor);

router.get('/friends/:userId', homeController.getFriendByUserId);

router.get('/conversation/:userID', homeController.getHomeConversation);
router.put('/conversation/:convID', homeController.putHomeConversation);

router.post('/messages/pinmessage', homeController.postHomePinMessage);
router.put('/messages/pinmessage/:pinMessID', homeController.putHomePinMessage);
router.delete('/messages/pinmessage/:pinMessID', homeController.deleteHomePinMessage);

router.delete('/messages/:messID', homeController.deleteHomeMessages);
router.put('/messages/:messID', homeController.putHomeMessages);
router.post('/messages/:convID', homeController.postHomeMessages);
router.get('/messages/:convID', homeController.getHomeMessages);
router.get('/conversation/:userID', homeController.getHomeConversation);
router.get('/conversation/name/:convID', homeController.getConversationNameById);
router.put('/conversation/:convID', homeController.putHomeConversation);

router.post('/call/:convID', homeController.startHomeCall);
router.post('/call/logs-group-call/:convID', homeController.createLogJoinGroupCall);
router.patch('/call/ongoing/:callID', homeController.setCallOngoing);
router.patch('/call/completed/:callID', homeController.setCallCompleted);
router.patch('/call/declined/:callID', homeController.setCallDecliend);
router.patch('/call/cancelled/:callID', homeController.setCallCancelled);
router.patch('/call/missed/:callID', homeController.setCallMissed);

module.exports = router;
