const { Op } = require('sequelize');
const conversationsModel = require('../models/conversationsModel');
const Participant = require('../models/participantsModel');
const Message = require('../models/messagesModel');

class ConversationsService {
    // Lấy conversations theo điều kiện filter
    // Hỗ trợ: { id: [array] } hoặc bất kỳ where object nào
    async getAllConversations(where = {}) {
        const resolvedWhere = { is_active: true };

        if (where.id) {
            resolvedWhere.id = Array.isArray(where.id)
                ? { [Op.in]: where.id }
                : where.id;
        }

        return await conversationsModel.findAll({
            where: resolvedWhere,
            order: [['updated_at', 'DESC']]
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
    async createConversation(conversation_type = "direct", name, avatar_url, created_by, last_message_id, last_message_at) {
        return await conversationsModel.create({
            conversation_type,
            name: name || null,
            avatar_url: avatar_url || null,
            created_by: created_by || null,
            last_message_id: last_message_id || null,
            last_message_at: last_message_at || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
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

    // Xóa/Giải tán conversation
    async deleteConversation(conversationId) {
        const conversation = await conversationsModel.findByPk(conversationId);
        if (!conversation) return false;

        const transaction = await conversationsModel.sequelize.transaction();
        try {
            const now = new Date();

            // 1. Cho tất cả thành viên rời nhóm (đặt left_at)
            await Participant.update({
                left_at: now
            }, {
                where: {
                    conversation_id: conversationId,
                    left_at: null
                },
                transaction
            });

            // Tìm sender_id cho tin nhắn hệ thống
            let senderId = conversation.created_by;
            if (!senderId) {
                // Thử tìm owner trong participants
                const owner = await Participant.findOne({
                    where: {
                        conversation_id: conversationId,
                        role: 'owner'
                    },
                    transaction
                });
                if (owner) {
                    senderId = owner.user_id;
                } else {
                    // Thử tìm bất cứ participant nào
                    const anyParticipant = await Participant.findOne({
                        where: { conversation_id: conversationId },
                        transaction
                    });
                    if (anyParticipant) {
                        senderId = anyParticipant.user_id;
                    }
                }
            }

            // Nếu vẫn không có senderId, rollback và return false
            if (!senderId) {
                await transaction.rollback();
                return false;
            }

            // 2. Thêm tin nhắn hệ thống báo nhóm đã giải tán
            const systemMessage = await Message.create({
                conversation_id: conversationId,
                sender_id: senderId,
                message_type: 'system',
                content: '<i class="bi bi-x-circle"></i> Trưởng nhóm đã giải tán nhóm',
                is_deleted: false,
                created_at: now,
                updated_at: now
            }, { transaction });

            // 3. Cập nhật last_message_id và last_message_at của cuộc hội thoại
            await conversation.update({
                last_message_id: systemMessage.id,
                last_message_at: now,
                updated_at: now
            }, { transaction });

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            console.error('Error in deleteConversation:', error);
            throw error;
        }
    }

    // Cập nhật key_status cho E2EE rotation
    async updateKeyStatus(conversationId, keyStatus) {
        const validStatuses = ['no_key', 'active', 'require_rotation'];
        if (!validStatuses.includes(keyStatus)) throw new Error(`Invalid key_status: ${keyStatus}`);

        const conversation = await conversationsModel.findByPk(conversationId);
        if (!conversation) return null;

        return await conversation.update({
            key_status: keyStatus,
            updated_at: new Date().toISOString(),
        });
    }
}

module.exports = new ConversationsService();
