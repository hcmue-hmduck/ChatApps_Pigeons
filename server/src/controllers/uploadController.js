const uploadService = require('../services/uploadService');
const SuccessResponse = require('../core/successResponse');


class CloudinaryController {
    async uploadFile(req, res) {
        try {
            const convID = req.params.convID;
            const uploadedFields = req.files || {};
            const files = [
                ...(uploadedFields.files || [])
            ];

            if (!files || files.length === 0) {
                return res.status(400).json({
                    message: 'No files uploaded',
                    hint: 'Send files with field name "files" in multipart/form-data',
                });
            }

            // Upload tất cả files song song
            const uploadPromises = files.map(file =>
                uploadService.uploadToCloudinary(file.path, { convID: convID })
            );

            const uploadResults = await Promise.all(uploadPromises);

            new SuccessResponse({
                message: `${uploadResults.length} file(s) uploaded successfully`,
                metadata: {
                    files: uploadResults.map((result, i) => {
                        const ext = result.format || files[i].originalname.split('.').pop() || 'bin';
                        return {
                            url: result.secure_url,
                            file_size: result.bytes,
                            file_name: files[i].originalname,
                            thumbnail_url: result.resource_type === 'image'
                                ? result.secure_url.replace('/upload/', '/upload/w_200,c_scale/')
                                : result.secure_url.replace('.' + result.format, '.jpg'),
                            public_id: result.public_id,
                            resource_type: result.resource_type,
                            format: ext,
                            duration: result.duration || 0
                        };
                    })
                }
            }).send(res);
        } catch (error) {
            res.status(500).json({ message: 'File upload failed', error: error.message });
        }
    }
}

module.exports = new CloudinaryController();