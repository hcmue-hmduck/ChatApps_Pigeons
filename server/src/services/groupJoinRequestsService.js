const groupJoinRequestsModel = require('../models/groupJoinRequestsModel');
const participantsModel = require('../models/participantsModel');
const { BadRequestError } = require('../core/errorResponse');
const { sequelize } = require('../configs/sequelizeConfig');

class GroupJoinRequestsService {
    
    // Gửi yêu cầu vào nhóm
    async createRequest(user_id, conversation_id, note) {
        // 1. Kiểm tra xem đã có yêu cầu 'pending' nào chưa
        const existing = await groupJoinRequestsModel.findOne({
            where: { user_id, conversation_id, status: 'pending' }
        });
        if (existing) {
            throw new BadRequestError('Bạn đã gửi yêu cầu vào nhóm này rồi và đang chờ duyệt.');
        }
        
        // 2. Tạo yêu cầu mới
        return await groupJoinRequestsModel.create({
            user_id,
            conversation_id,
            note
        });
    }

    // Lấy danh sách yêu cầu của 1 nhóm (Dành cho Admin)
    async getRequestsByGroup(conversation_id, status = 'pending') {
        return await groupJoinRequestsModel.findAll({
            where: { conversation_id, status },
            order: [['created_at', 'DESC']]
        });
    }

    // Xử lý yêu cầu (Duyệt/Từ chối)
    async updateRequestStatus(request_id, status, processed_by) {
        const request = await groupJoinRequestsModel.findByPk(request_id);
        if (!request) {
            throw new BadRequestError('Không tìm thấy yêu cầu.');
        }
        
        if (request.status !== 'pending') {
            throw new BadRequestError('Yêu cầu này đã được xử lý trước đó.');
        }

        return await sequelize.transaction(async (t) => {
            // 1. Cập nhật trạng thái yêu cầu
            await request.update({ status, processed_by }, { transaction: t });

            // 2. Nếu được duyệt, thêm user vào bảng participants
            if (status === 'approved') {
                await participantsModel.create({
                    conversation_id: request.conversation_id,
                    user_id: request.user_id,
                    role: 'member', // Mặc định là member
                    joined_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, { transaction: t });
            }

            return request;
        });
    }
}

module.exports = new GroupJoinRequestsService();
