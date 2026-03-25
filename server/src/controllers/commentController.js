const commentsService = require('../services/commentsService');
const SuccessResponse = require('../core/successResponse');

class CommentController {
    async createComment(req, res) {
        const postID = req.params.postID;
        const commentData = req.body;
        const newComment = await commentsService.createComment(postID, commentData);
        new SuccessResponse({
            message: 'Create comment successfully',
            metadata: {
                newComment: newComment,
            },
        }).send(res);
    }
}

module.exports = new CommentController();
