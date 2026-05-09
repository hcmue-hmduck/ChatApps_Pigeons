const SuccessResponse = require("../core/successResponse.js");
const groupJoinRequestsService = require('../services/groupJoinRequestsService');

class GroupJoinRequestsController {
    
    // Gửi yêu cầu vào nhóm
    async create(req, res, next) {
        try {
            const { id: user_id } = req.user; // Lấy ID từ token auth
            const { conversation_id, note } = req.body;
            
            const result = await groupJoinRequestsService.createRequest(user_id, conversation_id, note);
            
            return new SuccessResponse({
                message: 'Gửi yêu cầu vào nhóm thành công',
                metadata: result
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Lấy danh sách yêu cầu của nhóm (Dành cho Admin)
    async getRequestsByGroup(req, res, next) {
        try {
            const { conversation_id } = req.params;
            const { status } = req.query; // Có thể lọc theo status
            
            const result = await groupJoinRequestsService.getRequestsByGroup(conversation_id, status);
            
            return new SuccessResponse({
                message: 'Lấy danh sách yêu cầu thành công',
                metadata: result
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Duyệt hoặc từ chối yêu cầu
    async updateStatus(req, res, next) {
        try {
            const { id: processed_by } = req.user; // Admin xử lý
            const { id: request_id } = req.params;
            const { status } = req.body; // 'approved' hoặc 'rejected'
            
            const result = await groupJoinRequestsService.updateRequestStatus(request_id, status, processed_by);
            
            return new SuccessResponse({
                message: `Yêu cầu đã được ${status === 'approved' ? 'chấp nhận' : 'từ chối'}`,
                metadata: result
            }).send(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new GroupJoinRequestsController();
