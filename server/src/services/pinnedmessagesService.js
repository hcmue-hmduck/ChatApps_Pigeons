const pinnedmessagesModel = require('../models/pinnedmessagesModel');

class PinnedMessagesService {
    async createPinnedMessage(data) {
        console.log("data: ", data);
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
            }
        });
    }

    async updatePinnedMessage(data) {
        return await pinnedmessagesModel.update(data, {
            where: {
                id: data.id
            }
        });
    }
}

module.exports = new PinnedMessagesService();