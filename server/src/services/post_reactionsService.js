const postReactionService = require('./postreactionsService');

class PostReactionsService {
    async getPostReactions(post_id) {
        return await postReactionService.getPostReactions(post_id);
    }

    async addPostReaction(post_id, user_id, reaction_type, emoji_char) {
        return await postReactionService.addPostReaction(post_id, user_id, reaction_type, emoji_char);
    }

    async removePostReaction(id) {
        return await postReactionService.removePostReaction(id);
    }
}

module.exports = new PostReactionsService();