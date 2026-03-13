const commentsModel = require('../models/commentsModel');

class CommentsService {
    async getAllComment() {
        return await commentsModel.findAll({
            where: { is_deleted: false },
            order: [['created_at', 'ASC']],
        })
    }

    async getCommentsByPostIds(postIds) {
        try {
            return await commentsModel.findAll({
                where: {
                    post_id: postIds,
                    is_deleted: false
                },
                order: [['created_at', 'ASC']]
            });
        } catch (error) {
            console.error('Error fetching comments by post IDs:', error);
            throw error;
        }
    }

    async getCommentsByPostId(postId, limit = 20, offset = 0) {
        try {
            const comments = await commentsModel.findAll({
                where: { post_id: postId, is_deleted: false },
                order: [['created_at', 'ASC']],
                limit,
                offset
            });
            return comments;
        } catch (error) {
            console.error('Error fetching comments by post ID:', error);
            throw error;
        }
    }
}

module.exports = new CommentsService();