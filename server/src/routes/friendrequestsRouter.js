const express = require('express');
const router = express.Router();
const friendrequestsController = require('../controllers/friendrequestsController');

router.get('/:receiverId', friendrequestsController.getFriendRequests);
router.post('/', friendrequestsController.createFriendRequest);
router.put('/:receiverId', friendrequestsController.updateFriendRequestStatus);

module.exports = router;