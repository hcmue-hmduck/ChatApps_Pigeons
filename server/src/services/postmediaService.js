const postmediaModel = require('../models/postmediaModel');

class PostMediaService {
    async createPostMedia(postId, mediaData) {
        if (!mediaData || !Array.isArray(mediaData) || mediaData.length === 0) {
            return [];
        }

        const mediaToCreate = mediaData.map(media => ({
            post_id: postId,
            media_type: media.resource_type === 'raw' ? 'file' : media.resource_type,
            media_url: media.resource_type === 'raw'
                ? (media.download_url || media.url)
                : media.url,
            thumbnail_url: media.thumbnail_url,
            duration: media.duration || 0,
            file_name: media.file_name,
            file_size: media.file_size
        }));

        return await postmediaModel.bulkCreate(mediaToCreate);
    }

    async deletePostMedia(postId) {
        return await postmediaModel.destroy({ where: { post_id: postId } });
    }

    async getPostMediaByPostId(postId) {
        return await postmediaModel.findAll({ where: { post_id: postId } });
    }

    async deletePostMediaByPostId(postId) {
        return await postmediaModel.destroy({ where: { post_id: postId } });
    }
}

module.exports = new PostMediaService();