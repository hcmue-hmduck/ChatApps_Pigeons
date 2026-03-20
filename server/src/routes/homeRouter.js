const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');

router.get('/emojis', homeController.getAllEmojis);

router.post('/comments/:postID', homeController.createComment);

router.post('/participants/:convID', homeController.createParticipant);
router.put('/participants/:id', homeController.putParticipant);

router.get('/feeds', homeController.getHomePosts);
router.post('/feeds', homeController.createNewPost);
router.post('/feeds/:postID', homeController.createNewMediaPost);
router.put('/feeds/:postID', homeController.updatePost);
router.delete('/feeds/:postID', homeController.deletePost);

router.get('/users/search', homeController.searchUsers);

router.get('/friendrequests/:receiverId', homeController.getFriendRequests);
router.get('/friendrequests/sent/:senderId', homeController.getSentFriendRequests);
router.post('/friendrequests', homeController.createFriendRequest);
router.put('/friendrequests/:id', homeController.updateFriendRequestStatus);

router.get('/userblocks/:blockerId', homeController.getUserBlocks);
router.post('/userblocks', homeController.createUserBlock);
router.delete('/userblocks/:id', homeController.deleteUserBlock);

router.get('/userinfor/:userID', homeController.getUserInfor);
router.put('/userinfor/:userID', homeController.putUserInfor);

router.get('/friends/:userId', homeController.getFriendByUserId);
router.post('/friends/:userId', homeController.createFriendByUserId);
router.delete('/friends/:userId', homeController.deleteFriendByUserId);


router.get('/link-preview', homeController.getLinkPreview);

router.post('/messages/pinmessage', homeController.postHomePinMessage);
router.put('/messages/pinmessage/:pinMessID', homeController.putHomePinMessage);
router.delete('/messages/pinmessage/:pinMessID', homeController.deleteHomePinMessage);

router.get('/messages/:convID/media', homeController.getHomeMessagesMedia);
router.delete('/messages/:messID', homeController.deleteHomeMessages);
router.put('/messages/:messID', homeController.putHomeMessages);
router.post('/messages/:convID', homeController.postHomeMessages);
router.get('/messages/:convID', homeController.getHomeMessages);

router.post('/call/:convID', homeController.startHomeCall);
router.post('/call/logs-group-call/:convID', homeController.createLogJoinGroupCall);
router.patch('/call/ongoing/:callID', homeController.setCallOngoing);
router.patch('/call/completed/:callID', homeController.setCallCompleted);
router.patch('/call/declined/:callID', homeController.setCallDecliend);
router.patch('/call/cancelled/:callID', homeController.setCallCancelled);
router.patch('/call/missed/:callID', homeController.setCallMissed);
router.patch('/call/ended/:callID', homeController.setCallEnded);



module.exports = router;
