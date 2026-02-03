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

        // 2. Batch query song song các thông tin cần thiết
        const [conversations, allParticipants] = await Promise.all([
            conversationsService.getAllConversations({ id: conversationIds }),
            participantsService.getAllParticipants({ conversation_id: conversationIds })
        ]);

        // 3. Lấy user info cho tất cả participants
        const userIds = [...new Set(allParticipants.map(p => p.user_id))];
        const users = await usersService.getAllUsers({ id: userIds });

        // 4. Lấy last message cho tất cả conversation (batch)
        const lastMessageIds = conversations
            .map(conv => conv.last_message_id)
            .filter(id => !!id);

        let lastMessagesArr = [];
        if (lastMessageIds.length > 0) {
            lastMessagesArr = await messagesService.getMessagesByIds(lastMessageIds);
        }

        // 5. Tạo Map để lookup nhanh O(1) thay vì find O(n)
        const lastMessagesMap = new Map(lastMessagesArr.map(msg => [msg.id, msg]));
        const usersMap = new Map(users.map(u => [u.id, u]));
        const participantsMap = new Map();
        
        allParticipants.forEach(p => {
            
            if (!participantsMap.has(p.conversation_id)) {
                participantsMap.set(p.conversation_id, []);
            }
            const user = usersMap.get(p.user_id);
            participantsMap.get(p.conversation_id).push(
                user ? { user_id: user.id, full_name: user.full_name, avatar_url: user.avatar_url } 
                     : { user_id: p.user_id }
            );
        });

        // 6. Tổng hợp dữ liệu cho sidebar (chỉ lọc 1 lần)
        return conversations
            .filter(conv => participantsMap.has(conv.id) && 
                           participantsMap.get(conv.id).some(p => p.user_id === userId))
            .map(conv => {
                const convParticipants = participantsMap.get(conv.id);
                
                // Xác định tiêu đề hội thoại
                let title = conv.name;
                if (!title) {
                    const other = convParticipants.find(u => u.user_id !== userId);
                    title = other ? other.full_name : 'Cuộc trò chuyện';
                }
                
                return {
                    conversation_id: conv.id,
                    title,
                    type: conv.conversation_type,
                    participants: convParticipants,
                    lastMessage: lastMessagesMap.get(conv.last_message_id) || null
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
