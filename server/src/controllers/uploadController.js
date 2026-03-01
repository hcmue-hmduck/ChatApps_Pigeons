const uploadService = require('../services/uploadService');
const SuccessResponse = require('../core/successResponse');


class CloudinaryController {
    async uploadFile(req, res) {
        try {
            const convID = req.params.convID;
            const files = req.files;
            
            if (!files || files.length === 0) {
                return res.status(400).json({ 
                    message: 'No files uploaded',
                    hint: 'Send files with field name "files" in multipart/form-data'
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
                    files: uploadResults.map(result => ({
                        url: result.secure_url,
                        public_id: result.public_id,
                        resource_type: result.resource_type,
                        format: result.format
                    }))
                }
            }).send(res);
        } catch (error) {
            res.status(500).json({ message: 'File upload failed', error: error.message });
        }
    }
}

module.exports = new CloudinaryController();