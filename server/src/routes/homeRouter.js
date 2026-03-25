const express = require('express');
const router = express.Router();
const postReactionsRouter = require('./post_reactionsRouter');
const homeConversationRouter = require('./homeConversationsRouter');
const homeMessagesRouter = require('./homeMessagesRouter');
const messageReactionsRouter = require('./message_reactionsRouter');
const friendrequestsRouter = require('./friend_requestsRouter');
const homePostRouter = require('./homePostRouter');
const emojiRouter = require ('./emojiRouter');
const commentRouter = require('./commentRouter');
const userblocksRouter = require('./user_blocksRouter');
const pinmessageRouter = require('./pin_messageRouter');
const usersRouter = require('./usersRouter');
const linkPreviewRouter = require('./link_previewRouter');
const participantsRouter = require('./participantsRouter');
const friendRouter = require('./friendRouter');
const searchRouter = require('./searchRouter');

const homeController = require('../controllers/homeController');

router.use('/userinfor', usersRouter);
router.use('/post-reactions', postReactionsRouter);
router.use('/conversation', homeConversationRouter);
router.use('/message-reactions', messageReactionsRouter);
router.use('/friendrequests', friendrequestsRouter);
router.use('/feeds', homePostRouter);
router.use('/emojis', emojiRouter);
router.use('/comments', commentRouter);
router.use('/userblocks', userblocksRouter);
router.use('/pinmessage', pinmessageRouter);
router.use('/messages', homeMessagesRouter);
router.use('/link-preview', linkPreviewRouter);
router.use('/participants', participantsRouter);
router.use('/friends', friendRouter);
router.use('/search', searchRouter);


// router.get('/friendrequests/:receiverId', homeController.getFriendRequests);
// router.get('/friendrequests/sent/:senderId', homeController.getSentFriendRequests);
// router.post('/friendrequests', homeController.createFriendRequest);
// router.put('/friendrequests/:id', homeController.updateFriendRequestStatus);



router.post('/call/:convID', homeController.startHomeCall);
router.post('/call/logs-group-call/:convID', homeController.createLogJoinGroupCall);
router.patch('/call/ongoing/:callID', homeController.setCallOngoing);
router.patch('/call/completed/:callID', homeController.setCallCompleted);
router.patch('/call/declined/:callID', homeController.setCallDecliend);
router.patch('/call/cancelled/:callID', homeController.setCallCancelled);
router.patch('/call/missed/:callID', homeController.setCallMissed);
router.patch('/call/ended/:callID', homeController.setCallEnded);



module.exports = router;
