const postsModel = require('../models/postsModel');

class PostsService {
    async getHomePosts(limit = 30, offset = 0, status = 'approved', userId = null) {
        try {
            const { Op } = require('sequelize');
            const where = { is_deleted: false };
            if (status && status !== 'all') {
                where.status = status;
            }
            
            if (userId) {
                where[Op.or] = [
                    { privacy: 'public' },
                    { privacy: 'only_me', user_id: userId }
                ];
            } else {
                where.privacy = 'public';
            }

            const posts = await postsModel.findAll({
                order: [['created_at', 'DESC']],
                where,
                limit,
                offset
            });
            return posts;
        } catch (error) {
            console.error('Error fetching home posts:', error);
            throw error;
        }
    }

    async getPostsByIds(postIds) {
        try {
            if (!postIds || postIds.length === 0) return [];
            return await postsModel.findAll({
                where: { id: postIds }
            });
        } catch (error) {
            console.error('Error fetching posts by ids:', error);
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

    async updatePost(postId, data, options = {}) {
        try {
            return await postsModel.update(data, { where: { id: postId }, ...options });
        } catch (error) {
            console.error('Error updating post:', error);
            throw error;
        }
    }

    async deletePost(postId) {
        try {
            return await postsModel.update({ is_deleted: true }, { where: { id: postId } });
        } catch (error) {
            console.error('Error deleting post:', error);
            throw error;
        }
    }

    async countAllPosts() {
        try {
            return await postsModel.count();
        } catch (error) {
            console.error('Error counting posts:', error);
            throw error;
        }
    }

    async getPostsCountByDay() {
        try {
            const { Op } = require('sequelize');
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            return await postsModel.findAll({
                attributes: [
                    [postsModel.sequelize.fn('date_trunc', 'day', postsModel.sequelize.col('created_at')), 'date'],
                    [postsModel.sequelize.fn('COUNT', postsModel.sequelize.col('id')), 'count']
                ],
                where: {
                    created_at: {
                        [Op.gte]: sevenDaysAgo
                    }
                },
                group: [postsModel.sequelize.fn('date_trunc', 'day', postsModel.sequelize.col('created_at'))],
                order: [[postsModel.sequelize.fn('date_trunc', 'day', postsModel.sequelize.col('created_at')), 'ASC']],
                raw: true
            });
        } catch (error) {
            console.error('Error getting posts count by day:', error);
            throw error;
        }
    }
}

module.exports = new PostsService();