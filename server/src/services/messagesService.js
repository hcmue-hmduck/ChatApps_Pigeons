const { Op } = require('sequelize');
const messagesModel = require('../models/messagesModel');


class MessagesService {
    // Lấy tất cả messages
    async getAllMessages() {
        return await messagesModel.findAll({
            where: { is_deleted: false },
            include: [
                {
                    association: 'call',
                    required: false,
                },
            ],
        });
    }

    // Lấy message theo ID
    async getMessageById(messageId) {
        return await messagesModel.findByPk(messageId, {
            include: [
                {
                    association: 'call',
                    required: false,
                },
            ],
        });
    }

    // Thêm vào class MessagesService
    async getMessagesByIds(ids) {
        return await messagesModel.findAll({
            where: { id: ids },
            include: [
                {
                    association: 'call',
                    required: false,
                },
            ],
        });
    }

    async getAllMessagesByConversationId(conversationId, limit = 100, offset = 0) {
        const messages = await messagesModel.findAll({
            where: { conversation_id: conversationId },
            include: [
                {
                    association: 'call',
                    required: false,
                },
            ],
            order: [['created_at', 'DESC']], // Lấy tin nhắn mới nhất trước
            limit: limit, // Giới hạn số lượng tin nhắn
            offset: offset, // Bỏ qua số tin nhắn đầu (cho pagination)
        });
        // Đảo ngược lại để hiển thị theo thứ tự cũ nhất đến mới nhất
        return messages.reverse();
    }

    // Tạo message mới
    async createMessage(messageData, options = {}) {
        console.log('Creating message with data:', messageData);
        return await messagesModel.create(messageData, options);
    }

    // Cập nhật message
    async updateMessage(messageId, messageData) {
        messageData.is_edited = true;
        messageData.updated_at = new Date();
        const message = await messagesModel.findByPk(messageId);
        if (message) {
            return await message.update(messageData);
        }
        return null;
    }

    // Xóa message (Soft Delete)
    async deleteMessage(messageId) {
        const message = await messagesModel.findByPk(messageId);
        if (message) {
            // Soft delete - chỉ đánh dấu is_deleted = true
            return await message.update({
                is_deleted: true,
                updated_at: new Date(),
            });
        }
        return null;
    }

    // Đếm số lượng tin nhắn chưa đọc cho nhiều cuộc hội thoại
    async countUnreadMessages(convReadTimestamps) {
        if (convReadTimestamps.length === 0) return {};

        const orConditions = convReadTimestamps.map(item => ({
            conversation_id: item.conversation_id,
            created_at: { [Op.gt]: item.last_read_at },
            is_deleted: false
        }));

        const counts = await messagesModel.findAll({
            attributes: [
                'conversation_id',
                [messagesModel.sequelize.fn('COUNT', messagesModel.sequelize.col('id')), 'unread_count']
            ],
            where: {
                [Op.or]: orConditions
            },
            group: ['conversation_id'],
            raw: true
        });

        const result = {};
        counts.forEach(c => {
            result[c.conversation_id] = parseInt(c.unread_count, 10);
        });
        return result;
    }

}

module.exports = new MessagesService();
