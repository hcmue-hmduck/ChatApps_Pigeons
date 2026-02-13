const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');

router.delete('/messages/:messID', homeController.deleteHomeMessages);
router.put('/messages/:messID', homeController.putHomeMessages);
router.post('/messages/:convID', homeController.postHomeMessages); 
router.get('/messages/:convID', homeController.getHomeMessages);
router.get('/conversation/:userID', homeController.getHomeConversation);
router.put('/conversation/:convID', homeController.putHomeConversation);


module.exports = router;