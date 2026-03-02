const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');

router.put('/userinfor/:userID', homeController.putUserInfor);

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
router.post('/call/accept/:convID', homeController.acceptHomeCall);
router.patch('/call/ongoing/:callID', homeController.checkOngoingHomeCall);
router.patch('/call/completed/:callID', homeController.checkCompletedHomeCall);
router.patch('/call/declined/:callID', homeController.checkDeclinedHomeCall);
router.patch('/call/cancelled/:callID', homeController.checkCancelledHomeCall);
router.patch('/call/missed/:callID', homeController.checkMissedHomeCall);

module.exports = router;
