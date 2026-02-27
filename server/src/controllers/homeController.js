const homeService = require('../services/homeService');
const SuccessResponse = require('../core/successResponse');

class HomeController {
    // GET /:id - Lấy dữ liệu home cho user
    async getHomeConversation(req, res) {
        const homeConversationData = await homeService.getAllUserMessagesInJoinedConversations(req.params.userID);
        if (homeConversationData.length === 0) {
            return new SuccessResponse({
                message: 'No home data found',
                metadata: {}
            }).send(res);
        }
        new SuccessResponse({
            message: 'Get home data successfully',
            metadata: {
                homeConversationData: homeConversationData,
            }
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
            }
        }).send(res);
    }

    async postHomeMessages(req, res) {
        const conversationId = req.params.convID;
        const { senderId, content, parent_message_id } = req.body;
        const newMessage = await homeService.postMessageToConversation(conversationId, senderId, content, parent_message_id);
        new SuccessResponse({
            message: 'Post home message successfully',
            metadata: {
                newMessage: newMessage,
            }
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
            }
        }).send(res);
    }

    async deleteHomeMessages(req, res) {
        const messageId = req.params.messID;
        const deleteResult = await homeService.deleteMessageInConversation(messageId);
        new SuccessResponse({
            message: 'Delete home message successfully',
            metadata: {
                deleteResult: deleteResult,
            }
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
            }
        }).send(res);
    }

    async postHomePinMessage(req, res) {
        const pinMessageData = req.body;
        const newPinMessage = await homeService.createPinMessage(pinMessageData);
        new SuccessResponse({
            message: 'Create pin message successfully',
            metadata: {
                newPinMessage: newPinMessage,
            }
        }).send(res);
    }
}

module.exports = new HomeController();