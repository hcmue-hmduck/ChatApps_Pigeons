const postmediaModel = require('../models/postmediaModel');

class PostMediaService {
    async createPostMedia(postId, mediaData, options = {}) {
        if (!mediaData || !Array.isArray(mediaData) || mediaData.length === 0) {
            return [];
        }

        const mediaToCreate = mediaData.map(media => {
            const resourceType = media.resource_type || media.media_type;
            const mediaType = resourceType === 'raw' ? 'file' : resourceType;
            
            if (mediaType === 'link') {
                console.log('--- Saving Link Media Metadata ---', {
                    url: media.media_url || media.url,
                    title: media.file_name,
                    description: media.link_description || media.description,
                    siteName: media.link_site_name || media.site_name || media.siteName
                });
            }

            return {
                post_id: postId,
                media_type: mediaType,
                media_url: resourceType === 'raw'
                    ? (media.download_url || media.url || media.media_url)
                    : (media.url || media.media_url),
                thumbnail_url: media.thumbnail_url,
                duration: media.duration || 0,
                file_name: media.file_name || '',
                file_size: media.file_size || 0,
                link_description: media.link_description || media.description || '',
                link_site_name: media.link_site_name || media.site_name || media.siteName || ''
            };
        });

        return await postmediaModel.bulkCreate(mediaToCreate, options);
    }

    async deletePostMedia(postId, options = {}) {
        return await postmediaModel.destroy({ where: { post_id: postId }, ...options });
    }

    async getPostMediaByPostId(postId, options = {}) {
        return await postmediaModel.findAll({ where: { post_id: postId }, ...options });
    }

    async deletePostMediaByPostId(postId, options = {}) {
        return await postmediaModel.destroy({ where: { post_id: postId }, ...options });
    }
}

module.exports = new PostMediaService();