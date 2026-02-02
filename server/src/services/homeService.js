const usersService = require('./usersService');
const participantsService = require('./participantsService');
const messagesService = require('./messagesService');
const conversationsService = require('./conversationsService');

class HomeService {
    // Lấy tất cả messages của 1 user theo userId
    async getMessagesByUser(userId) {
        // Giả sử bạn có hàm getAllMessages trong messagesService
        return await messagesService.getAllMessages({ sender_id: userId });
    }

    // Lấy tất cả participant record của 1 user
    async getParticipantsByUser(userId) {
        // Giả sử bạn có hàm getAllParticipants trong participantsService
        return await participantsService.getAllParticipants({ user_id: userId });
    }

    // Lấy danh sách conversations của user để hiển thị sidebar
    async getAllUserMessagesInJoinedConversations(userId) {
        // 1. Lấy tất cả participant record của user
        const userParticipants = await participantsService.getAllParticipants({ user_id: userId });
        const conversationIds = userParticipants.map(p => p.conversation_id);
        if (conversationIds.length === 0) return [];

        // 2. Lấy thông tin các conversation
        const conversations = await conversationsService.getAllConversations({ id: conversationIds });

        // 3. Lấy participants cho các conversation này
        const allParticipants = await participantsService.getAllParticipants({ conversation_id: conversationIds });

        // 4. Lấy user info cho tất cả participants
        const userIds = [...new Set(allParticipants.map(p => p.user_id))];
        const users = await usersService.getAllUsers({ id: userIds });

        // 5. Lấy last message cho tất cả conversation (batch)
        const lastMessageIds = conversations
            .map(conv => conv.last_message_id)
            .filter(id => !!id);

        // console.log('Last Message IDs:', lastMessageIds);
        for (const id of lastMessageIds) {
            console.log('Last Message ID:', await messagesService.getMessageById(id));
        }

        let lastMessagesArr = [];
        if (lastMessageIds.length > 0) {
            lastMessagesArr = await messagesService.getMessagesByIds(lastMessageIds); // Hàm này cần trả về mảng messages theo id
        }
        const lastMessagesMap = {};
        lastMessagesArr.forEach(msg => {
            lastMessagesMap[msg.id] = msg;
        });

        // 6. Tổng hợp dữ liệu cho sidebar
        // Chỉ trả về các conversation mà userId là participant
        return conversations
            .filter(conv => allParticipants.some(p => p.conversation_id === conv.id && p.user_id === userId))
            .map(conv => {
                const convParticipants = allParticipants.filter(p => p.conversation_id === conv.id)
                    .map(p => {
                        const u = users.find(u => u.id === p.user_id);
                        return u ? { user_id: u.id, full_name: u.full_name, avatar_url: u.avatar_url } : { user_id: p.user_id };
                    });
        
                // Xác định tiêu đề hội thoại
                let title = conv.name;
                if (!title) {
                    // Nếu là chat 1-1, lấy tên user còn lại (không phải userId hiện tại)
                    const other = convParticipants.find(u => u.user_id !== userId);
                    title = other ? other.full_name : 'Cuộc trò chuyện';
                }
                return {
                    conversation_id: conv.id,
                    title,
                    type: conv.conversation_type,
                    participants: convParticipants,
                    lastMessage: conv.last_message_id ? lastMessagesMap[conv.last_message_id] : null
                };
            });
    }

    // Lấy tất cả messages trong 1 conversation (tối ưu: batch lấy user info)
    async getMessagesByConversation(conversationId) {
        const conversation = await conversationsService.getConversationById(conversationId);

        const messages = await messagesService.getAllMessagesByConversationId(conversationId);
        // Lấy tất cả sender_id duy nhất
        const senderIds = [...new Set(messages.map(m => m.sender_id))];
        const senders = await usersService.getAllUsers({ id: senderIds });
        // Map sender info theo id
        const senderMap = {};
        senders.forEach(u => {
            senderMap[u.id] = u;
        });
        // Gắn info vào từng message
        messages.forEach(m => {
            const sender = senderMap[m.sender_id];
            m.dataValues.sender_name = sender ? sender.full_name : '';
            m.dataValues.sender_avatar = sender ? sender.avatar_url : '';
            m.dataValues.sender_status = sender ? sender.status : '';
        });

        const conversationData = {
            ...conversation.dataValues,
            messages
        };

        return conversationData;
    }

    async postMessageToConversation(conversationId, senderId, content) {
        // Tạo message mới
        const newMessage = await messagesService.createMessage({
            conversation_id: conversationId,
            sender_id: senderId,
            content: content,
            timestamp: new Date()
        });

        // Cập nhật last_message_id trong conversation
        await conversationsService.updateConversation(conversationId, {
            last_message_id: newMessage.id
        });

        return newMessage;
    }

    async updateMessageInConversation(messageId, messageData) {
        return await messagesService.updateMessage(messageId, messageData);
    }

    async updateConversation(conversationId, conversationData) {
        return await conversationsService.updateConversation(conversationId, conversationData);
    }
}

module.exports = new HomeService();
