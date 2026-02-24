const conversationsModel = require('../models/conversationsModel');

class ConversationsService {
    // Lấy tất cả conversations
    async getAllConversations() {
        return await conversationsModel.findAll({
            where: { is_active: true },
            order: [['updated_at', 'DESC']],
        });
    }

    // Lấy conversation theo ID
    async getConversationById(conversationId) {
        return await conversationsModel.findByPk(conversationId);
    }

    // Lấy conversation theo ID
    async getConversationNameById(conversationId) {
        return await conversationsModel.findByPk(conversationId, {
            attributes: ['name'],
        });
    }

    // Tạo conversation mới
    async createConversation(conversationData) {
        conversationData.created_at = new Date().toISOString();
        conversationData.updated_at = new Date().toISOString();
        return await conversationsModel.create(conversationData);
    }

    // Cập nhật conversation
    async updateConversation(conversationId, conversationData) {
        const conversation = await conversationsModel.findByPk(conversationId);
        conversationData.updated_at = new Date().toISOString();
        if (conversation) {
            return await conversation.update(conversationData);
        }
        return null;
    }

    // Xóa conversation (Soft Delete)
    async deleteConversation(conversationId) {
        const conversation = await conversationsModel.findByPk(conversationId);
        if (conversation) {
            // Soft delete - chỉ đánh dấu is_active = false
            await conversation.update({
                is_active: false,
                updated_at: new Date().toISOString(),
            });
            return true;
        }
        return false;
    }
}

module.exports = new ConversationsService();
