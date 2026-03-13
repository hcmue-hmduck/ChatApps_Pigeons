const postmediaModel = require('../models/postmediaModel');

class PostMediaService {
    async createPostMedia(postMedia) {
        return await postmediaModel.create(postMedia);
    }

    async getPostMediaByPostId(postId) {
        return await postmediaModel.findAll({ where: { post_id: postId } });
    }

    async deletePostMediaByPostId(postId) {
        return await postmediaModel.destroy({ where: { post_id: postId } });
    }
}

module.exports = new PostMediaService();