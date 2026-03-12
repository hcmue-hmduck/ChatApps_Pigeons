const multer = require('multer');
// Cấu hình multer - lưu tạm trong bộ nhớ
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Thư mục tạm
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // Giới hạn 50MB mỗi file
    fileFilter: (req, file, cb) => {
        // Client URI-encodes filename → server decodes safely (no latin1/utf8 ambiguity)
        try {
            file.originalname = decodeURIComponent(file.originalname);
        } catch {
            // Nếu không phải URI-encoded thì giữ nguyên
        }
        cb(null, true);
    }
});

module.exports = upload;