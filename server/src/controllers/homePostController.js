const homePostsService = require('../services/homePostService');
const SuccessResponse = require('../core/successResponse');

class HomePostController {
    async getHomePosts(req, res) {
        const limit = parseInt(req.query.limit) || 30;
        const offset = parseInt(req.query.offset) || 0;
        const status = req.query.status || 'approved';
        const homePosts = await homePostsService.getHomePosts(limit, offset, status);
        new SuccessResponse({
            message: 'Get home posts successfully',
            metadata: {
                homePosts: homePosts,
            },
        }).send(res);
    }

    async createNewPost(req, res) {
        try {
            const newPostData = req.body;
            const newPost = await homePostsService.createNewPost(newPostData);
            new SuccessResponse({
                message: 'Create new post successfully',
                metadata: {
                    newPost: newPost,
                },
            }).send(res);
        } catch (error) {
            const isModerationReject = error?.code === 'MODERATION_REJECTED';
            res.status(isModerationReject ? 400 : 500).json({
                message: isModerationReject
                    ? 'Nội dung không phù hợp để đăng. Vui lòng chỉnh sửa và thử lại.'
                    : (error?.message || 'Create post failed'),
            });
        }
    }

    async createNewMediaPost(req, res) {
        const postId = req.params.postID;
        const mediaData = req.body;
        const newMediaPost = await homePostsService.createPostMedia(postId, mediaData);
        new SuccessResponse({
            message: 'Create new media post successfully',
            metadata: {
                newMediaPost: newMediaPost,
            },
        }).send(res);
    }

    async deletePost(req, res) {
        const postId = req.params.postID;
        const deletedRows = await homePostsService.deletePostById(postId);
        new SuccessResponse({
            message: 'Delete post successfully',
            metadata: {
                deletedRows,
            },
        }).send(res);
    }

    async updatePost(req, res) {
        const postId = req.params.postID;
        const { postData, mediaData } = req.body;

        const updatedPost = await homePostsService.updatePostById(postId, postData, mediaData);

        new SuccessResponse({
            message: 'Update post successfully',
            metadata: {
                updatedFeed: updatedPost,
            },
        }).send(res);
    }
}

module.exports = new HomePostController();