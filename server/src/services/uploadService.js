const cloudinary = require('../configs/cloudinaryConfig');

class UploadService {
    static FILE_TYPES = {
        IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif'],
        VIDEOS: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'mpeg', 'mpg'],
        AUDIOS: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'],
        DOCUMENTS: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
        ARCHIVES: ['zip', 'rar', '7z', 'tar', 'gz']
    };

    static getResourceType(filename) {
        const extension = filename.split('.').pop().toLowerCase();

        if (this.FILE_TYPES.IMAGES.includes(extension)) return 'image';
        if (this.FILE_TYPES.VIDEOS.includes(extension)) return 'video';
        if (this.FILE_TYPES.AUDIOS.includes(extension)) return 'video'; // Cloudinary xử lý audio như video
        if (this.FILE_TYPES.DOCUMENTS.includes(extension)) return 'raw';
        if (this.FILE_TYPES.ARCHIVES.includes(extension)) return 'raw';

        return 'auto'; // Cloudinary tự động phát hiện
    }

    async uploadToCloudinary(filePath, options = {}) {
        const folderPath = `chatPigeons/${options.convID || ''}`;
        const resourceType = options.resource_type || this.constructor.getResourceType(filePath);

        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload(filePath, {
                folder: folderPath,
                resource_type: resourceType
            }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            });
        });
    }
}

module.exports = new UploadService();