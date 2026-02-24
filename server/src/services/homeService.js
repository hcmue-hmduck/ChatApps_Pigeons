const usersService = require('./usersService');
const participantsService = require('./participantsService');
const messagesService = require('./messagesService');
const conversationsService = require('./conversationsService');
const pinnedmessagesService = require('./pinnedmessagesService');

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
        const conversationIds = userParticipants.map((p) => p.conversation_id);
        if (conversationIds.length === 0) return [];

        // 2. Batch query song song các thông tin cần thiết
        const [conversations, allParticipants] = await Promise.all([
            conversationsService.getAllConversations({ id: conversationIds }),
            participantsService.getAllParticipants({ conversation_id: conversationIds }),
        ]);

        // 3. Song song hóa query users và lastMessages
        const userIds = [...new Set(allParticipants.map((p) => p.user_id))];
        const lastMessageIds = conversations.map((conv) => conv.last_message_id).filter((id) => !!id);

        const [users, lastMessagesArr] = await Promise.all([
            usersService.getAllUsers({ id: userIds }),
            lastMessageIds.length > 0 ? messagesService.getMessagesByIds(lastMessageIds) : Promise.resolve([]),
        ]);

        // 4. Tạo Map để lookup nhanh O(1) thay vì find O(n)
        const lastMessagesMap = new Map(lastMessagesArr.map((msg) => [msg.id, msg]));
        const usersMap = new Map(users.map((u) => [u.id, u]));
        const participantsMap = new Map();
        const conversationsMap = new Map(conversations.map((c) => [c.id, c]));
        const ownerInfoMap = new Map(); // Lưu riêng owner info cho từng conversation

        allParticipants.forEach((p) => {
            if (!participantsMap.has(p.conversation_id)) {
                participantsMap.set(p.conversation_id, []);
            }
            const user = usersMap.get(p.user_id);
            const conv = conversationsMap.get(p.conversation_id);
            const isOwner = conv && conv.created_by === p.user_id;

            const participantInfo = user
                ? {
                      user_id: user.id,
                      full_name: user.full_name,
                      avatar_url: user.avatar_url,
                      owner: isOwner,
                  }
                : {
                      user_id: p.user_id,
                      owner: isOwner,
                  };

            participantsMap.get(p.conversation_id).push(participantInfo);

            // Lưu riêng owner info để tránh phải find sau
            if (isOwner) {
                ownerInfoMap.set(p.conversation_id, participantInfo);
            }
        });

        const currentUser = usersMap.get(userId);
        const userInfo = currentUser
            ? {
                  id: currentUser.id,
                  full_name: currentUser.full_name,
                  avatar_url: currentUser.avatar_url,
                  email: currentUser.email,
                  status: currentUser.status,
              }
            : null;

        // 5. Tổng hợp dữ liệu cho sidebar (chỉ lọc 1 lần)
        const joinedConversations = conversations
            .filter(
                (conv) =>
                    participantsMap.has(conv.id) && participantsMap.get(conv.id).some((p) => p.user_id === userId),
            )
            .map((conv) => {
                const convParticipants = participantsMap.get(conv.id);
                // Xác định tiêu đề hội thoại
                let title = conv.name;
                if (!title) {
                    const other = convParticipants.find((u) => u.user_id !== userId);
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
                    lastMessage: lastMessagesMap.get(conv.last_message_id) || null,
                };
            });
        return {
            userInfo,
            joinedConversations,
        };
    }

    // Lấy tất cả messages trong 1 conversation (tối ưu: batch lấy user info)
    async getMessagesByConversation(conversationId, limit = 100, offset = 0) {
        // 1. Song song hóa queries ban đầu
        const [conversation, messages, pinnedMessages] = await Promise.all([
            conversationsService.getConversationById(conversationId),
            messagesService.getAllMessagesByConversationId(conversationId, limit, offset),
            pinnedmessagesService.getPinnedMessagesByConversationId(conversationId),
        ]);

        if (messages.length === 0 && (!pinnedMessages || pinnedMessages.length === 0)) {
            return {
                ...conversation.dataValues,
                messages: [],
                pinnedMessages: [],
                hasMore: false,
            };
        }

        // 2. Thu thập IDs cần thiết để query bổ sung (Messages & Users)
        const messageSenderIds = messages.map((m) => m.sender_id);
        const pinnedExecutorIds = (pinnedMessages || []).map((p) => p.pinned_by);

        // IDs của các tin nhắn liên quan (Parent messages + Pinned target messages)
        const parentMessageIds = messages.map((m) => m.parent_message_id).filter((id) => !!id);
        const pinnedTargetMessageIds = (pinnedMessages || []).map((p) => p.message_id);
        // Loại bỏ trùng lặp và null/undefined
        const refMessageIds = [...new Set([...parentMessageIds, ...pinnedTargetMessageIds])].filter((id) => !!id);

        // 3. Batch query các tin nhắn liên quan (nếu có)
        let refMessages = [];
        if (refMessageIds.length > 0) {
            refMessages = await messagesService.getMessagesByIds(refMessageIds);
        }

        // Tạo Map cho referinced messages
        const refMessagesMap = new Map(refMessages.map((m) => [m.id, m]));

        // 4. Thu thập User IDs từ messages liên quan
        const refMessageSenderIds = refMessages.map((m) => m.sender_id);

        // 5. Batch query TẤT CẢ users (sender, pinner, ref_sender)
        const allUserIds = [...new Set([...messageSenderIds, ...pinnedExecutorIds, ...refMessageSenderIds])];

        let allUsers = [];
        if (allUserIds.length > 0) {
            allUsers = await usersService.getAllUsers({ id: allUserIds });
        }
        const userMap = new Map(allUsers.map((u) => [u.id, u]));

        // 6. Map dữ liệu vào kết quả
        // 6.1 Map info cho Pinned Messages
        if (pinnedMessages) {
            pinnedMessages.forEach((pin) => {
                // Info người ghim (pinned_by là User ID, pinned_by_name là tên người ghim)
                const pinner = userMap.get(pin.pinned_by);
                pin.dataValues.pinned_by_name = pinner ? pinner.full_name : 'Unknown';

                // Info tin nhắn được ghim
                const targetMsg = refMessagesMap.get(pin.message_id);
                if (targetMsg) {
                    pin.dataValues.content = targetMsg.content;
                    pin.dataValues.sender_id = targetMsg.sender_id;
                    const sender = userMap.get(targetMsg.sender_id);
                    pin.dataValues.sender_name = sender ? sender.full_name : 'Unknown';
                } else {
                    pin.dataValues.content = 'Tin nhắn không tồn tại hoặc đã bị xóa';
                }
            });
        }

        // 6.2 Map info cho Messages chính
        messages.forEach((m) => {
            const sender = userMap.get(m.sender_id);
            m.dataValues.sender_name = sender ? sender.full_name : '';
            m.dataValues.sender_avatar = sender ? sender.avatar_url : '';
            m.dataValues.sender_status = sender ? sender.status : '';

            // Map parent info nếu có
            if (m.parent_message_id && refMessagesMap.has(m.parent_message_id)) {
                const parentMsg = refMessagesMap.get(m.parent_message_id);
                const parentSender = userMap.get(parentMsg.sender_id);

                m.dataValues.parent_message_info = {
                    parent_message_id: parentMsg.id,
                    parent_message_content: parentMsg.content,
                    parent_message_sender_id: parentMsg.sender_id,
                    parent_message_is_deleted: parentMsg.is_deleted,
                    parent_message_name: parentSender ? parentSender.full_name : 'Unknown',
                };
            }
        });

        return {
            ...conversation.dataValues,
            messages,
            pinnedMessages: pinnedMessages || [],
            hasMore: messages.length === limit, // Nếu trả về đủ limit thì có thể còn nữa
        };
    }

    async postMessageToConversation(conversationId, senderId, content, parent_message_id = null) {
        // Parallel query: Tạo message mới và lấy parent message info (nếu có)
        const [newMessage, parentMessage] = await Promise.all([
            messagesService.createMessage({
                conversation_id: conversationId,
                sender_id: senderId,
                content: content,
                parent_message_id: parent_message_id,
                time_sent: new Date(),
            }),
            parent_message_id ? messagesService.getMessageById(parent_message_id) : Promise.resolve(null),
        ]);

        // Cập nhật last_message_id trong conversation
        await conversationsService.updateConversation(conversationId, {
            last_message_id: newMessage.id,
        });

        // Nếu có parent message, lấy sender info
        let parent_message_info = null;
        if (parentMessage) {
            const parentSender = await usersService.getUserById(parentMessage.sender_id);
            parent_message_info = {
                parent_message_content: parentMessage.content,
                parent_message_sender_id: parentMessage.sender_id,
                parent_message_is_deleted: parentMessage.is_deleted,
                parent_message_name: parentSender ? parentSender.full_name : '',
            };
        }

        return {
            ...newMessage.dataValues,
            parent_message_info: parent_message_info,
        };
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

    async getConversationNameById(conversationId) {
        return await conversationsService.getConversationNameById(conversationId);
    }
}

module.exports = new HomeService();
