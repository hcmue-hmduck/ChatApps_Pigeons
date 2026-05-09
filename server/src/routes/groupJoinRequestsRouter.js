const express = require('express');
const router = express.Router();
const groupJoinRequestsController = require('../controllers/groupJoinRequestsController');
const { authentication } = require('../middlewares/authMiddleware.js');

// Tất cả các route này đều cần đăng nhập
router.use(authentication);

// Gửi yêu cầu vào nhóm
router.post('/', groupJoinRequestsController.create);

// Lấy danh sách yêu cầu của nhóm (Admin gọi)
router.get('/group/:conversation_id', groupJoinRequestsController.getRequestsByGroup);

// Xử lý yêu cầu (Duyệt/Từ chối)
router.put('/:id', groupJoinRequestsController.updateStatus);

module.exports = router;
