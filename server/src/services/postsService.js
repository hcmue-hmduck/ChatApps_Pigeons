const postsModel = require('../models/postsModel');

class PostsService {
    async getHomePosts(userId, limit = 20, offset = 0) {
        try {
            const posts = await postsModel.findAll({
                where: {
                    user_id: userId
                },
                order: [['created_at', 'DESC']],
                limit,
                offset
            });
            return posts;
        } catch (error) {
            console.error('Error fetching home posts:', error);
            throw error;
        }
    }
}

module.exports = new PostsService();