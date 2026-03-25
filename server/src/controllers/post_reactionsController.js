const PostReactionsService = require('../services/post_reactionsService');
const SuccessResponse = require('../core/successResponse');

class PostReactionsController {
    async addPostReaction(req, res) {
        const { post_id, user_id, reaction_type, emoji_char } = req.body;
        const newReaction = await PostReactionsService.addPostReaction(post_id, user_id, reaction_type, emoji_char);
        new SuccessResponse({
            message: 'Add post reaction successfully',
            metadata: {
                newReaction: newReaction,
            },
        }).send(res);
    }

    async removePostReaction(req, res) {
        const id = req.params.id;
        const deleteResult = await PostReactionsService.removePostReaction(id);
        new SuccessResponse({
            message: 'Remove post reaction successfully',
            metadata: {
                deleteResult: deleteResult,
            },
        }).send(res);
    }

    async getPostReactions(req, res) {
        const post_id = req.params.postID;
        const reactions = await PostReactionsService.getPostReactions(post_id);
        new SuccessResponse({
            message: 'Get post reactions successfully',
            metadata: {
                reactions: reactions,
            },
        }).send(res);
    }
}

module.exports = new PostReactionsController();