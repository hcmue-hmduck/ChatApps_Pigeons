const { Op } = require('sequelize');
const postReactionModel = require('../models/postreactionsModel');

class PostReactionService {
    async addPostReaction(post_id, user_id, reaction_type, emoji_char) {
        return await postReactionModel.create({
            post_id: post_id,
            user_id: user_id,
            reaction_type: reaction_type,
            emoji_char: emoji_char,
        });
    }

    async removePostReaction(id) {
        return await postReactionModel.destroy({
            where: {
                id: id
            },
        });
    }

    async getPostReactions(post_id) {
        return await postReactionModel.findAll({
            where: {
                post_id: post_id
            },
        });
    }
}

module.exports = new PostReactionService();