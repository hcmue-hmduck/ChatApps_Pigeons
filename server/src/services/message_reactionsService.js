const { Op } = require('sequelize');
const messageReactionModel = require('../models/messagereactionsModel');

class MessageReactionService {
    async addMessageReaction(message_id, user_id, conversation_id, emoji_char) {
        return await messageReactionModel.create({
            message_id: message_id,
            user_id: user_id,
            conversation_id: conversation_id,
            emoji_char: emoji_char,
        });
    }

    async removeMessageReaction(reactionID) {
        return await messageReactionModel.destroy({
            where: {
                id: reactionID,
            },
        });
    }

    async getMessageReactions(conversation_id) {
        return await messageReactionModel.findAll({
            where: {
                conversation_id: conversation_id
            },
        });
    }
}

module.exports = new MessageReactionService();
