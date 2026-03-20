const postsModel = require('../models/postsModel');

class PostsService {
    async getHomePosts(limit = 30, offset = 0) {
        try {
            const posts = await postsModel.findAll({
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

    async createPost(newPostData) {
        try {
            const newPost = await postsModel.create(newPostData);
            return newPost;
        } catch (error) {
            console.error('Error creating new post:', error);
            throw error;
        }
    }

    async updatePost(postId, data) {
        try {
            return await postsModel.update(data, { where: { id: postId } });
        } catch (error) {
            console.error('Error updating post:', error);
            throw error;
        }
    }

    async deletePost(postId) {
        try {
            return await postsModel.destroy({ where: { id: postId } });
        } catch (error) {
            console.error('Error deleting post:', error);
            throw error;
        }
    }
}

module.exports = new PostsService();