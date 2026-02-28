const homeService = require('../services/homeService');
const callService = require('../services/callService.js');
const SuccessResponse = require('../core/successResponse');

class HomeController {
    // GET /:id - Lấy dữ liệu home cho user
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
        const { senderId, content, parent_message_id } = req.body;
        const newMessage = await homeService.postMessageToConversation(
            conversationId,
            senderId,
            content,
            parent_message_id,
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

    // [POST] /home/call/accept/:convID
    async acceptHomeCall(req, res) {
        const conversation_id = req.params.convID;
        const { user_id } = req.body;
        new SuccessResponse({
            message: 'Accept home call successfully',
            metadata: await homeService.acceptCall({ conversation_id, user_id }),
        }).send(res);
    }

    // [PATCH] /home/call/ongoing/:callID
    async checkOngoingHomeCall(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'On going home call successfully',
            metadata: await homeService.checkOngoingCall(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/completed/:callID
    async checkCompletedHomeCall(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Check completed home call successfully',
            metadata: await homeService.checkCompletedCall(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/decliend/:callID
    async checkDeclinedHomeCall(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Declined home call successfully',
            metadata: await homeService.checkDeclinedCall(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/cancelled/:callID
    async checkCancelledHomeCall(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Cancel home call successfully',
            metadata: await homeService.checkCancelledCall(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/missed/:callID
    async checkMissedHomeCall(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Miss home call successfully',
            metadata: await homeService.checkMissedCall(call_id),
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
}

module.exports = new HomeController();
