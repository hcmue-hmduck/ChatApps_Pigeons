const pinnedmessagesModel = require('../models/pinnedmessagesModel');

class PinnedMessagesService {
    async createPinnedMessage(data) {
        return await pinnedmessagesModel.create(data);
    }

    async deletePinnedMessage(data) {
        return await pinnedmessagesModel.update({ is_deleted: true }, {
            where: {
                id: data.id
            }
        });
    }

    async getAllPinnedMessages() {
        return await pinnedmessagesModel.findAll();
    }

    async getPinnedMessagesByConversationId(conversationId) {
        return await pinnedmessagesModel.findAll({
            where: {
                conversation_id: conversationId,
                is_deleted: false,
            },
            order: [
                ['pinned_at', 'ASC']
            ]
        });
    }

    async updatePinnedMessage(pinMessageId, data) {
        return await pinnedmessagesModel.update(data, {
            where: {
                id: pinMessageId
            }
        });
    }
}

module.exports = new PinnedMessagesService();