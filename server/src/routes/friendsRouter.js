const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friendsController');

router.get('/friends/:userID', friendsController.getFriendByUserId);

module.exports = router;