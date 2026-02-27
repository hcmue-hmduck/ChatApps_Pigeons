const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');


router.get('/conversation/:userID', homeController.getHomeConversation);
router.put('/conversation/:convID', homeController.putHomeConversation);

router.post('/messages/pinmessage', homeController.postHomePinMessage);
router.delete('/messages/:messID', homeController.deleteHomeMessages);
router.put('/messages/:messID', homeController.putHomeMessages);
router.post('/messages/:convID', homeController.postHomeMessages); 
router.get('/messages/:convID', homeController.getHomeMessages);



module.exports = router;