const usersService = require('./usersService');
const postsService = require('./postsService');
const commentsService = require('./commentsService');
const postmediaService = require('./postmediaService');
const postReactionService = require('./post_reactionsService');
const { sequelize } = require('../configs/sequelizeConfig.js');

class HomePostService {
    async getHomePosts(limit = 30, offset = 0) {
        const posts = await postsService.getHomePosts(limit, offset);
        if (posts.length === 0) return [];

        return await this.enrichPosts(posts);
    }

    async enrichPosts(postList, currentDepth = 0) {
        if (!postList || postList.length === 0 || currentDepth > 2) return postList;

        const postIds = postList.map(post => post.id);
        const sharedPostIds = postList.map(p => p.shared_post_id).filter(Boolean);

        // 1. Fetch comments, media & reactions for these posts
        const [allComments, allPostMedias, allReactions] = await Promise.all([
            commentsService.getCommentsByPostIds(postIds),
            postmediaService.getPostMediaByPostId(postIds),
            postReactionService.getPostReactions(postIds)
        ]);

        // 2. Fetch original posts for shared posts
        let sharedPosts = [];
        if (sharedPostIds.length > 0) {
            sharedPosts = await postsService.getPostsByIds(sharedPostIds);
            // Recursively enrich shared posts
            sharedPosts = await this.enrichPosts(sharedPosts, currentDepth + 1);
        }
        const sharedPostsMap = new Map(sharedPosts.map(p => [p.id, p]));

        // 3. Collect ALL unique user IDs (Post authors, Comment authors, Reaction authors)
        const allUserIds = new Set([
            ...postList.map(p => p.user_id),
            ...allComments.map(c => c.user_id),
            ...allReactions.map(r => r.user_id)
        ]);

        // 4. Batch fetch all unique users in ONE query
        const users = await usersService.getAllUsers({ id: [...allUserIds] });
        const userMap = new Map(users.map(u => [u.id, u]));

        // 5. Group comments by post_id and attach user info
        const commentsMap = new Map();
        allComments.forEach(comment => {
            if (!commentsMap.has(comment.post_id)) {
                commentsMap.set(comment.post_id, []);
            }
            const commentWithUser = {
                ...comment.dataValues || comment,
                user_infor: userMap.get(comment.user_id) || null
            };
            commentsMap.get(comment.post_id).push(commentWithUser);
        });

        // 6. Group post media by post_id
        const mediaMap = new Map();
        allPostMedias.forEach(media => {
            if (!mediaMap.has(media.post_id)) {
                mediaMap.set(media.post_id, []);
            }
            mediaMap.get(media.post_id).push(media.dataValues || media);
        });

        // 7. Group reactions by post_id and attach user info
        const reactionsMap = new Map();
        allReactions.forEach(reaction => {
            if (!reactionsMap.has(reaction.post_id)) {
                reactionsMap.set(reaction.post_id, []);
            }
            const reactionWithUser = {
                ...reaction.dataValues || reaction,
                user_infor: userMap.get(reaction.user_id) || null
            };
            reactionsMap.get(reaction.post_id).push(reactionWithUser);
        });

        // 8. Map data into final results
        return postList.map(post => ({
            ...post.dataValues || post,
            post_media: mediaMap.get(post.id) || [],
            comments_count: commentsMap.get(post.id)?.length || 0,
            user_infor: userMap.get(post.user_id) || null,
            comments: commentsMap.get(post.id) || [],
            shared_post: sharedPostsMap.get(post.shared_post_id) || null,
            reactions: reactionsMap.get(post.id) || []
        }));
    }

    async createNewPost(newPostData) {
        return await postsService.createPost(newPostData);
    }

    async createPostMedia(postId, mediaData) {
        return await postmediaService.createPostMedia(postId, mediaData);
    }

    async updatePostById(postId, postData, mediaData) {
        const transaction = await sequelize.transaction();
        try {
            await postsService.updatePost(postId, postData, { transaction });

            if (mediaData && Array.isArray(mediaData)) {
                await postmediaService.deletePostMedia(postId, { transaction });
                if (mediaData.length > 0) {
                    await postmediaService.createPostMedia(postId, mediaData, { transaction });
                }
            }

            await transaction.commit();

            // Lấy lại bài đăng đã được cập nhật và làm giàu thông tin
            const updatedPosts = await postsService.getPostsByIds([postId]);
            const enriched = await this.enrichPosts(updatedPosts);
            return enriched[0];
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async deletePostById(postId) {
        return await postsService.deletePost(postId);
    }
}

module.exports = new HomePostService();
