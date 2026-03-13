const homeService = require('../services/homeService');
const SuccessResponse = require('../core/successResponse');

class HomeController {
    async getUserInfor(req, res) {
        const userID = req.params.userID;
        const userInfor = await homeService.getUserInfor(userID);
        new SuccessResponse({
            message: 'Get user infor successfully',
            metadata: {
                userInfor: userInfor,
            },
        }).send(res);
    }

    async putUserInfor(req, res) {
        const userID = req.params.userID;
        const userInfor = req.body;
        console.log(userID, userInfor);
        const updatedUserInfor = await homeService.updateUserInfor(userID, userInfor);
        new SuccessResponse({
            message: 'Update user infor successfully',
            metadata: {
                updatedUserInfor: updatedUserInfor,
            },
        }).send(res);
    }

    async getHomeConversation(req, res) {
        const homeConversationData = await homeService.getAllUserMessagesInJoinedConversations(req.params.userID);
        if (homeConversationData.length === 0) {
            return new SuccessResponse({
                message: 'No home data found',
                metadata: {},
            }).send(res);
        }
        new SuccessResponse({
            message: 'Get home data successfully',
            metadata: {
                homeConversationData: homeConversationData,
            },
        }).send(res);
    }

    async getConversationNameById(req, res) {
        const conversationId = req.params.convID;
        const groupName = await homeService.getConversationNameById(conversationId);
        new SuccessResponse({
            message: 'Get conversation name successfully',
            metadata: groupName,
        }).send(res);
    }

    async getHomeMessages(req, res) {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const homeMessagesData = await homeService.getMessagesByConversation(req.params.convID, limit, offset);
        new SuccessResponse({
            message: 'Get home messages successfully',
            metadata: {
                homeMessagesData: homeMessagesData,
            },
        }).send(res);
    }

    async postHomeMessages(req, res) {
        const conversationId = req.params.convID;
        const { senderId, content, parent_message_id, message_type, file_url, file_name, file_size, thumbnail_url, duration } = req.body;

        const newMessage = await homeService.postMessageToConversation(
            conversationId,
            senderId,
            content,
            parent_message_id,
            message_type,
            file_url,
            file_name,
            file_size,
            thumbnail_url,
            duration
        );
        new SuccessResponse({
            message: 'Post home message successfully',
            metadata: {
                newMessage: newMessage,
            },
        }).send(res);
    }

    async putHomeMessages(req, res) {
        const messageId = req.params.messID;
        const messageData = req.body;
        const updatedMessage = await homeService.updateMessageInConversation(messageId, messageData);
        new SuccessResponse({
            message: 'Put home message successfully',
            metadata: {
                updatedMessage: updatedMessage,
            },
        }).send(res);
    }

    async deleteHomeMessages(req, res) {
        const messageId = req.params.messID;
        const deleteResult = await homeService.deleteMessageInConversation(messageId);
        new SuccessResponse({
            message: 'Delete home message successfully',
            metadata: {
                deleteResult: deleteResult,
            },
        }).send(res);
    }

    async putHomeConversation(req, res) {
        const conversationId = req.params.convID;
        const conversationData = req.body;
        const updatedConversation = await homeService.updateConversation(conversationId, conversationData);
        new SuccessResponse({
            message: 'Put home conversation successfully',
            metadata: {
                updatedConversation: updatedConversation,
            },
        }).send(res);
    }

    // [POST] /home/call/:convID
    async startHomeCall(req, res) {
        const conversation_id = req.params.convID;
        new SuccessResponse({
            message: 'Start home call successfully',
            metadata: await homeService.startCall({ conversation_id, ...req.body }),
        }).send(res);
    }

    // [POST] /home/call/logs-group-call/:convID
    async createLogJoinGroupCall(req, res) {
        const conversation_id = req.params.convID;
        const { user_id } = req.body;
        new SuccessResponse({
            message: 'Create log join group call successfully',
            metadata: await homeService.createLogJoinGroupCall({ conversation_id, user_id }),
        }).send(res);
    }

    // [PATCH] /home/call/ongoing/:callID
    async setCallOngoing(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Set call ongoing successfully',
            metadata: await homeService.setCallOngoing(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/completed/:callID
    async setCallCompleted(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Set call completed successfully',
            metadata: await homeService.setCallCompleted(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/decliend/:callID
    async setCallDecliend(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Set call declined successfully',
            metadata: await homeService.setCallDecliend(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/cancelled/:callID
    async setCallCancelled(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Set call cancelled successfully',
            metadata: await homeService.setCallCancelled(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/missed/:callID
    async setCallMissed(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Set call missed successfully',
            metadata: await homeService.setCallMissed(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/ended/:callID
    async setCallEnded(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Set call ended successfully',
            metadata: await homeService.endCall(call_id),
        }).send(res);
    }

    async postHomePinMessage(req, res) {
        const pinMessageData = req.body;
        const newPinMessage = await homeService.createPinMessage(pinMessageData);
        new SuccessResponse({
            message: 'Create pin message successfully',
            metadata: {
                newPinMessage: newPinMessage,
            },
        }).send(res);
    }

    async putHomePinMessage(req, res) {
        const messageId = req.params.pinMessID;
        const messageData = req.body;
        console.log(messageId, messageData);
        const updatedMessage = await homeService.updatePinMessage(messageId, messageData);
        new SuccessResponse({
            message: 'Put home pin message successfully',
            metadata: {
                updatedMessage: updatedMessage,
            },
        }).send(res);
    }

    async deleteHomePinMessage(req, res) {
        const messageId = req.params.pinMessID;
        const deleteResult = await homeService.deletePinMessage(messageId);
        new SuccessResponse({
            message: 'Delete home pin message successfully',
            metadata: {
                deleteResult: deleteResult,
            },
        }).send(res);
    }

    async getFriendByUserId(req, res) {
        const userId = req.params.userId;
        const friends = await homeService.getFriendByUserId(userId);
        new SuccessResponse({
            message: 'Get friends successfully',
            metadata: {
                friends: friends,
            },
        }).send(res);
    }

    async createFriendByUserId(req, res) {
        const userId = req.params.userId;
        const { friend_id, is_favorite, notes } = req.body;
        const newFriend = await homeService.createFriendByUserId(userId, friend_id, is_favorite, notes);
        new SuccessResponse({
            message: 'Create friend successfully',
            metadata: {
                newFriend: newFriend,
            },
        }).send(res);
    }

    async getFriendRequests(req, res) {
        const receiverId = req.params.receiverId;
        const friendRequests = await homeService.getFriendRequests(receiverId);
        new SuccessResponse({
            message: 'Get friend requests successfully',
            metadata: {
                friendRequests: friendRequests,
            },
        }).send(res);
    }

    async createFriendRequest(req, res) {
        const { senderId, receiverId, note } = req.body;
        const newFriendRequest = await homeService.createFriendRequest(senderId, receiverId, note);
        new SuccessResponse({
            message: 'Create friend request successfully',
            metadata: {
                newFriendRequest: newFriendRequest,
            },
        }).send(res);
    }

    async updateFriendRequestStatus(req, res) {
        const id = req.params.id;
        const { status } = req.body;
        const updatedFriendRequest = await homeService.updateFriendRequestStatus(id, status);
        new SuccessResponse({
            message: 'Update friend request status successfully',
            metadata: {
                updatedFriendRequest: updatedFriendRequest,
            },
        }).send(res);
    }

    async getUserBlocks(req, res) {
        const blockerId = req.params.blockerId;
        const userBlocks = await homeService.getUserBlocks(blockerId);
        new SuccessResponse({
            message: 'Get user blocks successfully',
            metadata: {
                userBlocks: userBlocks,
            },
        }).send(res);
    }

    async createUserBlock(req, res) {
        const { blockerId, blockedId, reason } = req.body;
        const newUserBlock = await homeService.createUserBlock(blockerId, blockedId, reason);
        new SuccessResponse({
            message: 'Create user block successfully',
            metadata: {
                newUserBlock: newUserBlock,
            },
        }).send(res);
    }

    async deleteUserBlock(req, res) {
        const id = req.params.id;
        const deleteResult = await homeService.deleteUserBlock(id);
        new SuccessResponse({
            message: 'Delete user block successfully',
            metadata: {
                deleteResult: deleteResult,
            },
        }).send(res);
    }

    async getHomePosts(req, res) {
        const limit = parseInt(req.query.limit) || 30;
        const offset = parseInt(req.query.offset) || 0;
        const homePosts = await homeService.getHomePosts(limit, offset);
        new SuccessResponse({
            message: 'Get home posts successfully',
            metadata: {
                homePosts: homePosts,
            },
        }).send(res);
    }

}

module.exports = new HomeController();
