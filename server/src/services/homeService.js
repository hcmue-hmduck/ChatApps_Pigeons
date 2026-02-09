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

        // 3. Song song hóa query users và lastMessages
        const userIds = [...new Set(allParticipants.map(p => p.user_id))];
        const lastMessageIds = conversations
            .map(conv => conv.last_message_id)
            .filter(id => !!id);

        const [users, lastMessagesArr] = await Promise.all([
            usersService.getAllUsers({ id: userIds }),
            lastMessageIds.length > 0 
                ? messagesService.getMessagesByIds(lastMessageIds)
                : Promise.resolve([])
        ]);

        // 4. Tạo Map để lookup nhanh O(1) thay vì find O(n)
        const lastMessagesMap = new Map(lastMessagesArr.map(msg => [msg.id, msg]));
        const usersMap = new Map(users.map(u => [u.id, u]));
        const participantsMap = new Map();
        const conversationsMap = new Map(conversations.map(c => [c.id, c]));
        const ownerInfoMap = new Map(); // Lưu riêng owner info cho từng conversation

        allParticipants.forEach(p => {
            if (!participantsMap.has(p.conversation_id)) {
                participantsMap.set(p.conversation_id, []);
            }
            const user = usersMap.get(p.user_id);
            const conv = conversationsMap.get(p.conversation_id);
            const isOwner = conv && conv.created_by === p.user_id;
            
            const participantInfo = user ? { 
                user_id: user.id, 
                full_name: user.full_name, 
                avatar_url: user.avatar_url,
                owner: isOwner 
            } : { 
                user_id: p.user_id,
                owner: isOwner 
            };
            
            participantsMap.get(p.conversation_id).push(participantInfo);
            
            // Lưu riêng owner info để tránh phải find sau
            if (isOwner) {
                ownerInfoMap.set(p.conversation_id, participantInfo);
            }
        });

        const currentUser = usersMap.get(userId);
        const userInfo = currentUser ? {
            id: currentUser.id,
            full_name: currentUser.full_name,
            avatar_url: currentUser.avatar_url,
            email: currentUser.email,
            status: currentUser.status
        } : null;

        // 5. Tổng hợp dữ liệu cho sidebar (chỉ lọc 1 lần)
        const joinedConversations = conversations
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
                
                // Lấy owner info từ map (đã lưu sẵn, không cần find)
                const ownerInfo = ownerInfoMap.get(conv.id) || null;
                
                return {
                    conversation_id: conv.id,
                    title,
                    avatar_url: conv.avatar_url,
                    type: conv.conversation_type,
                    ownerInfo,
                    participants: convParticipants,
                    lastMessage: lastMessagesMap.get(conv.last_message_id) || null
                };
            });
        return {
            userInfo,
            joinedConversations
        };
    }

    // Lấy tất cả messages trong 1 conversation (tối ưu: batch lấy user info)
    async getMessagesByConversation(conversationId, limit = 100, offset = 0) {
        // Song song hóa TẤT CẢ queries: conversation, messages, VÀ có thể pre-fetch users
        // Nếu có cache participants, có thể lấy userIds từ đó
        const [conversation, messages] = await Promise.all([
            conversationsService.getConversationById(conversationId),
            messagesService.getAllMessagesByConversationId(conversationId, limit, offset)
        ]);

        // Chỉ query users khi thực sự có messages
        if (messages.length === 0) {
            return {
                ...conversation.dataValues,
                messages: [],
                hasMore: false // Không còn tin nhắn nào để load
            };
        }

        // Lấy tất cả sender_id duy nhất
        const senderIds = [...new Set(messages.map(m => m.sender_id))];
        const senders = await usersService.getAllUsers({ id: senderIds });

        // Map sender info theo id (dùng Map thay vì object)
        const senderMap = new Map(senders.map(u => [u.id, u]));

        // Lấy tất cả parent_message_id khác null
        const parentMessageIds = [...new Set(messages.map(m => m.parent_message_id).filter(id => !!id))];
        let parentMessagesMap = new Map();
        if (parentMessageIds.length > 0) {
            // Lấy tất cả parent messages
            const parentMessages = await messagesService.getMessagesByIds(parentMessageIds);
            // Lấy user info cho parent messages
            const parentSenderIds = [...new Set(parentMessages.map(pm => pm.sender_id))];
            let parentSenders = [];
            if (parentSenderIds.length > 0) {
                parentSenders = await usersService.getAllUsers({ id: parentSenderIds });
            }
            const parentSenderMap = new Map(parentSenders.map(u => [u.id, u]));
            // Map parent message info
            parentMessagesMap = new Map(parentMessages.map(pm => {
                const sender = parentSenderMap.get(pm.sender_id);
                return [pm.id, {
                    parent_message_id: pm.id,
                    parent_message_content: pm.content,
                    parent_message_sender_id: pm.sender_id,
                    parent_message_name: sender ? sender.full_name : ''
                }];
            }));
        }

        // Gắn info vào từng message
        messages.forEach(m => {
            const sender = senderMap.get(m.sender_id);
            m.dataValues.sender_name = sender ? sender.full_name : '';
            m.dataValues.sender_avatar = sender ? sender.avatar_url : '';
            m.dataValues.sender_status = sender ? sender.status : '';
            // Nếu có parent_message_id thì gắn thêm obj parent_message_info
            if (m.parent_message_id && parentMessagesMap.has(m.parent_message_id)) {
                m.dataValues.parent_message_info = parentMessagesMap.get(m.parent_message_id);
            }
        });

        return {
            ...conversation.dataValues,
            messages,
            hasMore: messages.length === limit // Nếu trả về đủ limit thì có thể còn nữa
        };
    }

    async postMessageToConversation(conversationId, senderId, content, parent_message_id = null) {
        // Tạo message mới
        const newMessage = await messagesService.createMessage({
            conversation_id: conversationId,
            sender_id: senderId,
            content: content,
            parent_message_id: parent_message_id,
            time_sent: new Date()
        });

        // Cập nhật last_message_id trong conversation
        await conversationsService.updateConversation(conversationId, {
            last_message_id: newMessage.id
        });

        // return newMessage;

        // Nếu có parent_message_id thì trả về thêm parent_message_info
        let parent_message_info = null;
        if (parent_message_id) {
            // Lấy parent message
            const parentMessage = await messagesService.getMessageById(parent_message_id);
            if (parentMessage) {
                // Lấy sender info cho parent message
                const parentSender = await usersService.getUserById(parentMessage.sender_id);
                parent_message_info = {
                    parent_message_content: parentMessage.content,
                    parent_message_sender_id: parentMessage.sender_id,
                    parent_message_name: parentSender ? parentSender.full_name : ''
                };
            }
        }

        return {
            ...newMessage.dataValues,
            parent_message_info: parent_message_info
        }
    }

    async updateMessageInConversation(messageId, messageData) {
        return await messagesService.updateMessage(messageId, messageData);
    }

    async deleteMessageInConversation(messageId) {
        return await messagesService.deleteMessage(messageId);
    }

    async updateConversation(conversationId, conversationData) {
        return await conversationsService.updateConversation(conversationId, conversationData);
    }
}

module.exports = new HomeService();
