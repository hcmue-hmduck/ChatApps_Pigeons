const usersService = require('./usersService');
const participantsService = require('./participantsService');
const messagesService = require('./messagesService');
const conversationsService = require('./conversationsService');
const pinnedmessagesService = require('./pinnedmessagesService');

class HomeService {
    // Lấy danh sách conversations của user để hiển thị sidebars
    async getAllUserMessagesInJoinedConversations(userId) {
        // 1. Lấy tất cả participant record của user
        const userParticipants = await participantsService.getAllParticipants({ user_id: userId });
        const conversationIds = userParticipants.map(p => p.conversation_id);
        if (conversationIds.length === 0) return { userInfo: null, joinedConversations: [] };

        // 2. Batch query song song: conversations + toàn bộ participants trong các conversations đó
        const [conversations, allParticipants] = await Promise.all([
            conversationsService.getAllConversations({ id: conversationIds }),
            participantsService.getAllParticipants({ conversation_id: conversationIds })
        ]);

        // 3. Thu thập userIds duy nhất → batch query users song song với lastMessages
        const userIds = [...new Set(allParticipants.map(p => p.user_id))];
        const lastMessageIds = conversations
            .map(conv => conv.last_message_id)
            .filter(Boolean);

        const [users, lastMessagesArr] = await Promise.all([
            usersService.getAllUsers({ id: userIds }),
            lastMessageIds.length > 0
                ? messagesService.getMessagesByIds(lastMessageIds)
                : Promise.resolve([])
        ]);

        // 4. Tạo Map để lookup O(1)
        const lastMessagesMap = new Map(lastMessagesArr.map(msg => [msg.id, msg]));
        const usersMap = new Map(users.map(u => [u.id, u]));
        const conversationsMap = new Map(conversations.map(c => [c.id, c]));

        // Build participantsMap & ownerInfoMap trong 1 lần duyệt
        const participantsMap = new Map();
        const ownerInfoMap = new Map();

        allParticipants.forEach(p => {
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

            if (!participantsMap.has(p.conversation_id)) {
                participantsMap.set(p.conversation_id, []);
            }
            participantsMap.get(p.conversation_id).push(participantInfo);

            if (isOwner) {
                ownerInfoMap.set(p.conversation_id, participantInfo);
            }
        });

        // Build userInfo cho current user
        const currentUser = usersMap.get(userId);
        const userInfo = currentUser ? {
            id: currentUser.id,
            full_name: currentUser.full_name,
            avatar_url: currentUser.avatar_url,
            email: currentUser.email,
            status: currentUser.status
        } : null;

        // 5. Tổng hợp sidebar — conversations đã filter theo conversationIds của user nên không cần .some()
        const joinedConversations = conversations.map(conv => {
            const convParticipants = participantsMap.get(conv.id) || [];

            let title = conv.name;
            if (!title) {
                const other = convParticipants.find(p => p.user_id !== userId);
                title = other ? other.full_name : 'Cuộc trò chuyện';
            }

            return {
                conversation_id: conv.id,
                title,
                avatar_url: conv.avatar_url,
                type: conv.conversation_type,
                ownerInfo: ownerInfoMap.get(conv.id) || null,
                participants: convParticipants,
                lastMessage: lastMessagesMap.get(conv.last_message_id) || null
            };
        });

        return { userInfo, joinedConversations };
    }

    // Lấy tất cả messages trong 1 conversation (có phân trang)
    async getMessagesByConversation(conversationId, limit = 100, offset = 0) {
        // 1. Song song hóa queries ban đầu
        const [conversation, messages, pinnedMessages] = await Promise.all([
            conversationsService.getConversationById(conversationId),
            messagesService.getAllMessagesByConversationId(conversationId, limit, offset),
            pinnedmessagesService.getPinnedMessagesByConversationId(conversationId)
        ]);

        if (!conversation) {
            throw new Error(`Conversation ${conversationId} not found`);
        }

        const safePinned = pinnedMessages || [];

        if (messages.length === 0 && safePinned.length === 0) {
            return {
                ...conversation.dataValues,
                messages: [],
                pinnedMessages: [],
                hasMore: false
            };
        }

        // 2. Thu thập tất cả IDs cần thiết
        const messageSenderIds = messages.map(m => m.sender_id);
        const pinnedExecutorIds = safePinned.map(p => p.pinned_by);
        const parentMessageIds = messages.map(m => m.parent_message_id).filter(Boolean);
        const pinnedTargetMessageIds = safePinned.map(p => p.message_id).filter(Boolean);
        const refMessageIds = [...new Set([...parentMessageIds, ...pinnedTargetMessageIds])];

        // 3. Query song song: refMessages + "known users" (sender + pinner)
        //    Không cần đợi refMessages mới query users — query trước users đã biết,
        //    rồi chỉ query thêm sender của refMessages nếu chưa có trong set
        const knownUserIds = [...new Set([...messageSenderIds, ...pinnedExecutorIds])];

        const [refMessages, knownUsers] = await Promise.all([
            refMessageIds.length > 0
                ? messagesService.getMessagesByIds(refMessageIds)
                : Promise.resolve([]),
            knownUserIds.length > 0
                ? usersService.getAllUsers({ id: knownUserIds })
                : Promise.resolve([])
        ]);

        // 4. Lấy thêm users từ refMessages nếu chưa có (tránh query trùng)
        const knownUserIdSet = new Set(knownUserIds);
        const refSenderIds = refMessages
            .map(m => m.sender_id)
            .filter(id => id && !knownUserIdSet.has(id));
        const uniqueRefSenderIds = [...new Set(refSenderIds)];

        const refSenderUsers = uniqueRefSenderIds.length > 0
            ? await usersService.getAllUsers({ id: uniqueRefSenderIds })
            : [];

        // 5. Merge tất cả users vào 1 Map
        const userMap = new Map([
            ...knownUsers.map(u => [u.id, u]),
            ...refSenderUsers.map(u => [u.id, u])
        ]);
        const refMessagesMap = new Map(refMessages.map(m => [m.id, m]));

        // 6. Map Pinned Messages → plain objects
        const mappedPinnedMessages = safePinned.map(pin => {
            const pinner = userMap.get(pin.pinned_by);
            const targetMsg = refMessagesMap.get(pin.message_id);
            const sender = targetMsg ? userMap.get(targetMsg.sender_id) : null;

            return {
                ...pin.dataValues,
                pinned_by_name: pinner ? pinner.full_name : 'Unknown',
                content: targetMsg ? targetMsg.content : 'Tin nhắn không tồn tại hoặc đã bị xóa',
                sender_id: targetMsg ? targetMsg.sender_id : null,
                sender_name: sender ? sender.full_name : 'Unknown'
            };
        });

        // 7. Map Messages chính → plain objects
        const mappedMessages = messages.map(m => {
            const sender = userMap.get(m.sender_id);
            const result = {
                ...m.dataValues,
                sender_name: sender ? sender.full_name : '',
                sender_avatar: sender ? sender.avatar_url : '',
                sender_status: sender ? sender.status : '',
                parent_message_info: null
            };

            if (m.parent_message_id) {
                const parentMsg = refMessagesMap.get(m.parent_message_id);
                if (parentMsg) {
                    const parentSender = userMap.get(parentMsg.sender_id);
                    result.parent_message_info = {
                        parent_message_id: parentMsg.id,
                        parent_message_content: parentMsg.content,
                        parent_message_sender_id: parentMsg.sender_id,
                        parent_message_is_deleted: parentMsg.is_deleted,
                        parent_message_name: parentSender ? parentSender.full_name : 'Unknown'
                    };
                }
            }

            return result;
        });

        return {
            ...conversation.dataValues,
            messages: mappedMessages,
            pinnedMessages: mappedPinnedMessages,
            hasMore: messages.length === limit
        };
    }

    async postMessageToConversation(conversationId, senderId, content, parent_message_id = null) {
        // 1. Tạo message mới + lấy parent message (song song)
        const [newMessage, parentMessage] = await Promise.all([
            messagesService.createMessage({
                conversation_id: conversationId,
                sender_id: senderId,
                content,
                parent_message_id,
                time_sent: new Date()
            }),
            parent_message_id
                ? messagesService.getMessageById(parent_message_id)
                : Promise.resolve(null)
        ]);

        // 2. Update conversation + lấy parent sender (song song — không phụ thuộc nhau)
        const [, parentSender] = await Promise.all([
            conversationsService.updateConversation(conversationId, {
                last_message_id: newMessage.id
            }),
            parentMessage
                ? usersService.getUserById(parentMessage.sender_id)
                : Promise.resolve(null)
        ]);

        const parent_message_info = parentMessage ? {
            parent_message_content: parentMessage.content,
            parent_message_sender_id: parentMessage.sender_id,
            parent_message_is_deleted: parentMessage.is_deleted,
            parent_message_name: parentSender ? parentSender.full_name : ''
        } : null;

        return {
            ...newMessage.dataValues,
            parent_message_info
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

    async createPinMessage(pinMessageData) {
        return await pinnedmessagesService.createPinnedMessage(pinMessageData);
    }
}

module.exports = new HomeService();
