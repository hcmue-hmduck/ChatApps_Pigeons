const uploadService = require('../services/uploadService');
const SuccessResponse = require('../core/successResponse');
const cloudinary = require('../configs/cloudinaryConfig');


class CloudinaryController {
    extractFiles(req) {
        const uploadedFields = req.files || {};
        return [...(uploadedFields.files || [])];
    }

    normalizeOriginalName(rawName) {
        try {
            return Buffer.from(rawName || '', 'latin1').toString('utf8').normalize('NFC');
        } catch {
            return rawName || 'file';
        }
    }

    getFormatFromNameOrUrl(originalName, secureUrl) {
        const fromName = (originalName || '').split('.').pop();
        if (fromName) return fromName.toLowerCase();

        try {
            const cleanUrl = (secureUrl || '').split('?')[0];
            const last = cleanUrl.split('/').pop() || '';
            const fromUrl = last.split('.').pop();
            return (fromUrl || 'bin').toLowerCase();
        } catch {
            return 'bin';
        }
    }

    buildDownloadUrl(result, originalName) {
        if (!result?.secure_url) return '';

        if (result.resource_type === 'raw' && result.public_id) {
            try {
                const format = this.getFormatFromNameOrUrl(originalName, result.secure_url);
                return cloudinary.utils.private_download_url(
                    result.public_id,
                    format,
                    {
                        resource_type: 'raw',
                        type: result.type || 'upload',
                        attachment: originalName || 'file',
                        expires_at: Math.floor(Date.now() / 1000) + 86400
                    }
                );
            } catch (error) {
                console.error('buildDownloadUrl raw-sign error:', {
                    message: error?.message,
                    public_id: result.public_id,
                    resource_type: result.resource_type,
                    type: result.type,
                    format: result.format
                });
            }
        }

        const encodedName = encodeURIComponent(originalName || 'file');
        const separator = result.secure_url.includes('?') ? '&' : '?';
        return `${result.secure_url}${separator}filename=${encodedName}`;
    }

    buildFileResponse(result, file) {
        const originalName = this.normalizeOriginalName(file.originalname);
        const ext = result.format || file.originalname.split('.').pop() || 'bin';
        const downloadUrl = this.buildDownloadUrl(result, originalName);
        const thumbnailUrl = result.resource_type === 'image'
            ? result.secure_url.replace('/upload/', '/upload/w_200,c_scale/')
            : (result.format
                ? result.secure_url.replace('.' + result.format, '.jpg')
                : result.secure_url);

        return {
            url: result.secure_url,
            download_url: downloadUrl,
            file_size: result.bytes,
            file_name: originalName,
            thumbnail_url: thumbnailUrl,
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: ext,
            duration: result.duration || 0
        };
    }

    async uploadFilesBatch(files, uploadOptions, logPrefix) {
        const uploadPromises = files.map(file =>
            uploadService
                .uploadToCloudinary(file.path, {
                    ...uploadOptions,
                    originalName: file.originalname
                })
                .catch((error) => {
                    console.error(`${logPrefix} single-file error:`, {
                        file: file.originalname,
                        message: error?.message,
                        http_code: error?.http_code,
                        name: error?.name
                    });
                    throw error;
                })
        );

        const uploadResults = await Promise.all(uploadPromises);
        return uploadResults.map((result, i) => this.buildFileResponse(result, files[i]));
    }

    logRequestError(logPrefix, error) {
        console.error(`${logPrefix} error:`, {
            message: error?.message,
            http_code: error?.http_code,
            name: error?.name,
            error
        });
    }

    async handleUpload(req, res, uploadOptions, logPrefix) {
        try {
            const files = this.extractFiles(req);

            if (!files.length) {
                return res.status(400).json({
                    message: 'No files uploaded',
                    hint: 'Send files with field name "files" in multipart/form-data',
                });
            }

            const uploadedFiles = await this.uploadFilesBatch(files, uploadOptions, logPrefix);

            new SuccessResponse({
                message: `${uploadedFiles.length} file(s) uploaded successfully`,
                metadata: {
                    files: uploadedFiles
                }
            }).send(res);
        } catch (error) {
            this.logRequestError(logPrefix, error);
            res.status(500).json({ message: 'File upload failed', error: error.message });
        }
    }

    async uploadFile(req, res) {
        return this.handleUpload(req, res, { convID: req.params.convID }, 'uploadFile');
    }

    async uploadFileFeeds(req, res) {
        return this.handleUpload(req, res, { feedID: req.params.feedID }, 'uploadFileFeeds');
    }
}

module.exports = new CloudinaryController();