const usersService = require('./usersService');
const participantsService = require('./participantsService');
const messagesService = require('./messagesService');
const conversationsService = require('./conversationsService');
const pinnedmessagesService = require('./pinnedmessagesService');
const friendsService = require('./friendsService');
const friendrequestsService = require('./friendrequestsService');
const userblockService = require('./userblockServices');
const postsService = require('./postsService');
const commentsService = require('./commentsService');
const postmediaService = require('./postmediaService');
const linkpreviewService = require('./linkpreviewService');

const { sequelize } = require('../configs/sequelizeConfig.js');
const callService = require('./callService.js');
const { CALL_STATUS } = require('../constants/call.constants.js');

class HomeService {
    async getLinkPreview(rawUrl) {
        const parsedUrl = linkpreviewService.normalizePreviewUrl(rawUrl);
        if (!parsedUrl) return null;

        const fallback = {
            url: parsedUrl.toString(),
            title: parsedUrl.hostname,
            description: '',
            image: null,
            siteName: parsedUrl.hostname,
            hostname: parsedUrl.hostname,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(parsedUrl.toString(), {
                method: 'GET',
                redirect: 'follow',
                signal: controller.signal,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            });

            if (!response.ok) {
                return fallback;
            }

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) {
                return fallback;
            }

            const html = await response.text();

            const ogTitle = linkpreviewService.extractMetaTag(html, 'property', 'og:title');
            const ogDescription = linkpreviewService.extractMetaTag(html, 'property', 'og:description');
            const ogImage = linkpreviewService.extractMetaTag(html, 'property', 'og:image');
            const ogSiteName = linkpreviewService.extractMetaTag(html, 'property', 'og:site_name');
            const metaDescription = linkpreviewService.extractMetaTag(html, 'name', 'description');
            const titleTag = linkpreviewService.extractTitleTag(html);

            let imageUrl = ogImage || null;
            if (imageUrl) {
                try {
                    imageUrl = new URL(imageUrl, parsedUrl).toString();
                } catch {
                    imageUrl = null;
                }
            }

            return {
                url: parsedUrl.toString(),
                title: (ogTitle || titleTag || parsedUrl.hostname || '').trim(),
                description: (ogDescription || metaDescription || '').trim(),
                image: imageUrl,
                siteName: (ogSiteName || parsedUrl.hostname || '').trim(),
                hostname: parsedUrl.hostname,
            };
        } catch {
            return fallback;
        } finally {
            clearTimeout(timeout);
        }
    }
    // Lấy danh sách conversations của user để hiển thị sidebar
    async getAllUserMessagesInJoinedConversations(userId) {
        // 1. Lấy tất cả participant record của user
        const userParticipants = await participantsService.getAllParticipants({ user_id: userId });
        const conversationIds = userParticipants.map((p) => p.conversation_id);
        if (conversationIds.length === 0) return {
            userInfo: await usersService.getUserById(userId),
            joinedConversations: []
        };

        // 2. Batch query song song: conversations + toàn bộ participants trong các conversations đó
        const [conversations, allParticipants] = await Promise.all([
            conversationsService.getAllConversations({ id: conversationIds }),
            participantsService.getAllParticipants({ conversation_id: conversationIds }),
        ]);

        // 3. Thu thập userIds duy nhất → batch query users song song với lastMessages
        const userIds = [...new Set(allParticipants.map((p) => p.user_id))];
        const lastMessageIds = conversations.map((conv) => conv.last_message_id).filter(Boolean);

        const [users, lastMessagesArr] = await Promise.all([
            usersService.getAllUsers({ id: userIds }),
            lastMessageIds.length > 0 ? messagesService.getMessagesByIds(lastMessageIds) : Promise.resolve([]),
        ]);

        // 4. Tạo Map để lookup O(1)
        const lastMessagesMap = new Map(lastMessagesArr.map((msg) => [msg.id, msg]));
        const usersMap = new Map(users.map((u) => [u.id, u]));
        const conversationsMap = new Map(conversations.map((c) => [c.id, c]));

        // Build participantsMap & ownerInfoMap trong 1 lần duyệt
        const participantsMap = new Map();
        const ownerInfoMap = new Map();

        allParticipants.forEach((p) => {
            const user = usersMap.get(p.user_id);
            const conv = conversationsMap.get(p.conversation_id);
            const isOwner = conv && conv.created_by === p.user_id;

            const participantInfo = user
                ? {
                    user_id: user.id,
                    full_name: user.full_name,
                    avatar_url: user.avatar_url,
                    last_online_at: user.last_online_at,
                    owner: isOwner,
                }
                : {
                    user_id: p.user_id,
                    owner: isOwner,
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
        const userInfo = currentUser
            ? {
                id: currentUser.id,
                password_hash: currentUser.password_hash,
                bio: currentUser.bio,
                phone_number: currentUser.phone_number,
                is_phone_verified: currentUser.is_phone_verified,
                is_email_verified: currentUser.is_email_verified,
                created_at: currentUser.created_at,
                updated_at: currentUser.updated_at,
                full_name: currentUser.full_name,
                avatar_url: currentUser.avatar_url,
                email: currentUser.email,
                status: currentUser.status,
                birthday: currentUser.birthday,
                gender: currentUser.gender,
                last_online_at: currentUser.last_online_at,
            }
            : null;

        // 5. Tổng hợp sidebar — conversations đã filter theo conversationIds của user nên không cần .some()
        const joinedConversations = conversations.map((conv) => {
            const convParticipants = participantsMap.get(conv.id) || [];

            let title = conv.name;
            if (!title) {
                const other = convParticipants.find((p) => p.user_id !== userId);
                title = other ? other.full_name : 'Cuộc trò chuyện';
            }

            return {
                conversation_id: conv.id,
                title,
                avatar_url: conv.avatar_url,
                type: conv.conversation_type,
                ownerInfo: ownerInfoMap.get(conv.id) || null,
                participants: convParticipants,
                lastMessage: lastMessagesMap.get(conv.last_message_id) || null,
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
            pinnedmessagesService.getPinnedMessagesByConversationId(conversationId),
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
                hasMore: false,
            };
        }

        // 2. Thu thập tất cả IDs cần thiết
        const messageSenderIds = messages.map((m) => m.sender_id);
        const pinnedExecutorIds = safePinned.map((p) => p.pinned_by);
        const parentMessageIds = messages.map((m) => m.parent_message_id).filter(Boolean);
        const pinnedTargetMessageIds = safePinned.map((p) => p.message_id).filter(Boolean);
        const refMessageIds = [...new Set([...parentMessageIds, ...pinnedTargetMessageIds])];

        // 3. Query song song: refMessages + "known users" (sender + pinner)
        //    Không cần đợi refMessages mới query users — query trước users đã biết,
        //    rồi chỉ query thêm sender của refMessages nếu chưa có trong set
        const knownUserIds = [...new Set([...messageSenderIds, ...pinnedExecutorIds])];

        const [refMessages, knownUsers] = await Promise.all([
            refMessageIds.length > 0 ? messagesService.getMessagesByIds(refMessageIds) : Promise.resolve([]),
            knownUserIds.length > 0 ? usersService.getAllUsers({ id: knownUserIds }) : Promise.resolve([]),
        ]);

        // 4. Lấy thêm users từ refMessages nếu chưa có (tránh query trùng)
        const knownUserIdSet = new Set(knownUserIds);
        const refSenderIds = refMessages.map((m) => m.sender_id).filter((id) => id && !knownUserIdSet.has(id));
        const uniqueRefSenderIds = [...new Set(refSenderIds)];

        const refSenderUsers =
            uniqueRefSenderIds.length > 0 ? await usersService.getAllUsers({ id: uniqueRefSenderIds }) : [];

        // 5. Merge tất cả users vào 1 Map
        const userMap = new Map([...knownUsers.map((u) => [u.id, u]), ...refSenderUsers.map((u) => [u.id, u])]);
        const refMessagesMap = new Map(refMessages.map((m) => [m.id, m]));

        // 6. Map Pinned Messages → plain objects
        const mappedPinnedMessages = safePinned.map((pin) => {
            const pinner = userMap.get(pin.pinned_by);
            const targetMsg = refMessagesMap.get(pin.message_id);
            const sender = targetMsg ? userMap.get(targetMsg.sender_id) : null;

            return {
                ...pin.dataValues,
                pinned_by_name: pinner ? pinner.full_name : 'Unknown',
                content: targetMsg ? targetMsg.content : 'Tin nhắn không tồn tại hoặc đã bị xóa',
                sender_id: targetMsg ? targetMsg.sender_id : null,
                sender_name: sender ? sender.full_name : 'Unknown',
            };
        });

        // 7. Map Messages chính → plain objects
        const mappedMessages = messages.map((m) => {
            const sender = userMap.get(m.sender_id);
            const result = {
                ...m.dataValues,
                sender_name: sender ? sender.full_name : '',
                sender_avatar: sender ? sender.avatar_url : '',
                sender_status: sender ? sender.status : '',
                parent_message_info: null,
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
                        parent_message_name: parentSender ? parentSender.full_name : 'Unknown',
                        parent_message_thumbnail_url: parentMsg.thumbnail_url,
                        parent_message_type: parentMsg.message_type,
                    };
                }
            }

            return result;
        });

        return {
            ...conversation.dataValues,
            messages: mappedMessages,
            pinnedMessages: mappedPinnedMessages,
            hasMore: messages.length === limit,
        };
    }

    async postMessageToConversation(
        conversationId,
        senderId,
        content,
        parent_message_id = null,
        message_type = 'text',
        file_url = null,
        file_name = null,
        file_size = null,
        thumbnail_url = null,
        duration = null
    ) {
        let resolvedFileUrl = file_url;
        let resolvedFileName = file_name;
        let resolvedFileSize = file_size;
        let resolvedThumbnailUrl = thumbnail_url;
        let resolvedDuration = duration;

        // Tận dụng các cột media hiện có để lưu link preview cho message text
        if (message_type === 'text' && content) {
            const detectedUrl = linkpreviewService.extractFirstUrlFromText(content);
            if (detectedUrl) {
                resolvedFileUrl = resolvedFileUrl || detectedUrl;

                const needFetchPreview = !resolvedFileName || !resolvedThumbnailUrl;
                if (needFetchPreview) {
                    const preview = await this.getLinkPreview(detectedUrl);
                    if (preview) {
                        resolvedFileUrl = resolvedFileUrl || preview.url || detectedUrl;
                        resolvedFileName = resolvedFileName || preview.title || preview.siteName || null;
                        resolvedThumbnailUrl = resolvedThumbnailUrl || preview.image || null;
                    }
                }
            }
        }

        // 1. Tạo message mới + lấy parent message (song song)
        const [newMessage, parentMessage] = await Promise.all([
            messagesService.createMessage({
                conversation_id: conversationId,
                sender_id: senderId,
                content,
                parent_message_id,
                message_type,
                file_url: resolvedFileUrl,
                file_name: resolvedFileName,
                file_size: resolvedFileSize,
                thumbnail_url: resolvedThumbnailUrl,
                duration: resolvedDuration,
                time_sent: new Date(),
            }),
            parent_message_id ? messagesService.getMessageById(parent_message_id) : Promise.resolve(null),
        ]);

        // 2. Update conversation + lấy parent sender (song song — không phụ thuộc nhau)
        const [, parentSender] = await Promise.all([
            conversationsService.updateConversation(conversationId, {
                last_message_id: newMessage.id,
            }),
            parentMessage ? usersService.getUserById(parentMessage.sender_id) : Promise.resolve(null),
        ]);

        const parent_message_info = parentMessage
            ? {
                parent_message_id: parentMessage.id,
                parent_message_content: parentMessage.content,
                parent_message_sender_id: parentMessage.sender_id,
                parent_message_is_deleted: parentMessage.is_deleted,
                parent_message_name: parentSender ? parentSender.full_name : '',
                parent_message_type: parentMessage.message_type,
                parent_message_thumbnail_url: parentMessage.thumbnail_url,
            }
            : null;

        return {
            ...newMessage.dataValues,
            parent_message_info,
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

    async createPinMessage(pinMessageData) {
        return await pinnedmessagesService.createPinnedMessage(pinMessageData);
    }

    async updatePinMessage(pinMessageId, pinMessageData) {
        return await pinnedmessagesService.updatePinnedMessage(pinMessageId, pinMessageData);
    }

    async deletePinMessage(pinMessageId) {
        return await pinnedmessagesService.deletePinnedMessage(pinMessageId);
    }

    async getUserInfor(userID) {
        return await usersService.getUserById(userID);
    }

    async updateUserInfor(userID, userInfor) {
        return await usersService.updateUser(userID, userInfor);
    }

    async startCall({ conversation_id, caller_id, call_type, media_type }) {
        return await sequelize.transaction(async (t) => {
            const call = await callService.startCall(
                { conversation_id, caller_id, call_type, media_type },
                { transaction: t },
            );

            const messageData = {
                conversation_id,
                sender_id: caller_id,
                message_type: 'call',
                call_id: call.id,
                content: `Cuộc gọi  ${media_type === 'audio' ? 'thoại' : media_type}`,
            };

            let message = await messagesService.createMessage(messageData, { transaction: t });

            return {
                ...message.get({ plain: true }), // Biến instance thành object thường
                call: call.get({ plain: true })
            };
        });
    }

    async createLogJoinGroupCall({ user_id, conversation_id }) {
        if (!user_id || !conversation_id) throw new Error('params is not found');
        return await messagesService.createMessage({
            conversation_id,
            sender_id: user_id,
            message_type: 'system',
            content: 'đã tham gia cuộc gọi.',
        });
    }

    async setCallOngoing(call_id) {
        const statusCall = await callService.getStatusById(call_id);
        if (statusCall !== CALL_STATUS['PENDING'])
            return {
                success: false,
                message: 'Call status is not pending',
            };
        return await callService.updateStatusCall({ call_id, status: 'ongoing' });
    }

    async setCallCompleted(call_id) {
        return await callService.updateStatusCall({ call_id, status: 'completed' });
    }

    async setCallDecliend(call_id) {
        return await callService.updateStatusCall({ call_id, status: 'declined' });
    }

    async setCallCancelled(call_id) {
        return await callService.updateStatusCall({ call_id, status: 'cancelled' });
    }

    async setCallMissed(call_id) {
        return await callService.updateStatusCall({ call_id, status: 'missed' });
    }

     async endCall(call_id) {
        const status = await callService.getStatusById(call_id);
        let newStatus = '';
        if (status === 'pending') newStatus = 'cancelled';
        else if (status === 'ongoing') newStatus = 'completed';

        if (!newStatus)
            return {
                completed: false,
                message: 'status invalid',
            };

        return await callService.updateStatusCall({ call_id, status: newStatus });
    }

    async getFriendByUserId(userId) {
        const listFriends = await friendsService.getFriendByUserId(userId);
        if (listFriends.length === 0) return [];

        // Tối ưu N+1 query: Lấy toàn bộ user info của bạn bè trong 1 query duy nhất
        const friendIds = listFriends.map(friend => friend.friend_id);
        const friendInfos = await usersService.getAllUsers({ id: friendIds });

        // Chuyển thành Map để tra cứu với độ phức tạp O(1)
        const friendInfoMap = new Map(friendInfos.map(user => [user.id, user]));

        return listFriends.map(friend => {
            const friendInfo = friendInfoMap.get(friend.friend_id) || {};
            return {
                ...friend.dataValues,
                full_name: friendInfo.full_name,
                avatar_url: friendInfo.avatar_url,
                status: friendInfo.status
            };
        })
    }

    async createFriendByUserId(userId, friend_id, is_favorite, notes) {
        return await friendsService.createFriendByUserId(userId, friend_id, is_favorite, notes);
    }

    async getFriendRequests(receiverId) {
        const friendRequests = await friendrequestsService.getFriendRequests(receiverId);
        if (friendRequests.length === 0) return [];

        const senderIds = friendRequests.map(req => req.sender_id);
        const senderInfos = await usersService.getAllUsers({ id: senderIds });

        const senderInfoMap = new Map(senderInfos.map(user => [user.id, user]));

        return friendRequests.map(req => {
            const senderInfo = senderInfoMap.get(req.sender_id) || {};
            return {
                ...req.dataValues,
                sender_name: senderInfo.full_name,
                sender_avatar: senderInfo.avatar_url,
            };
        });
    }

    async getSentFriendRequests(senderId) {
        const friendRequests = await friendrequestsService.getSentFriendRequests(senderId);
        if (friendRequests.length === 0) return [];

        const receiverIds = friendRequests.map(req => req.receiver_id);
        const receiverInfos = await usersService.getAllUsers({ id: receiverIds });

        const receiverInfoMap = new Map(receiverInfos.map(user => [user.id, user]));

        return friendRequests.map(req => {
            const receiverInfo = receiverInfoMap.get(req.receiver_id) || {};
            return {
                ...req.dataValues,
                receiver_name: receiverInfo.full_name,
                receiver_avatar: receiverInfo.avatar_url,
            };
        });
    }

    async createFriendRequest(senderId, receiverId, note) {
        return await friendrequestsService.createFriendRequest(senderId, receiverId, note);
    }

    async updateFriendRequestStatus(id, status) {
        return await friendrequestsService.updateFriendRequestStatus(id, status);
    }

    async getUserBlocks(blockerId) {
        return await userblockService.getUserBlocks(blockerId);
    }

    async createUserBlock(blockerId, blockedId, reason) {
        return await userblockService.createUserBlock(blockerId, blockedId, reason);
    }

    async deleteUserBlock(id) {
        return await userblockService.deleteUserBlock(id);
    }

    async getHomePosts(limit = 30, offset = 0) {
        const posts = await postsService.getHomePosts(limit, offset);
        if (posts.length === 0) return [];

        const postIds = posts.map(post => post.id);
        
        // 1. Fetch comments first to collect all necessary user IDs
        const allComments = await commentsService.getCommentsByPostIds(postIds);
        const allPostMedias = await postmediaService.getPostMediaByPostId(postIds);

        // 2. Collect ALL unique user IDs (Post authors + Comment authors)
        const allUserIds = new Set([
            ...posts.map(p => p.user_id),
            ...allComments.map(c => c.user_id)
        ]);

        // 3. Batch fetch all unique users in ONE query
        const users = await usersService.getAllUsers({ id: [...allUserIds] });
        const userMap = new Map(users.map(u => [u.id, u]));

        // 4. Group comments by post_id and attach user info to each comment
        const commentsMap = new Map();
        allComments.forEach(comment => {
            if (!commentsMap.has(comment.post_id)) {
                commentsMap.set(comment.post_id, []);
            }
            
            // Đính kèm user_infor vào comment (thay vì chỉ để user_id)
            const commentWithUser = {
                ...comment.dataValues || comment,
                user_infor: userMap.get(comment.user_id) || null
            };
            
            commentsMap.get(comment.post_id).push(commentWithUser);
        });

        // 5. Group post media by post_id
        const mediaMap = new Map();
        allPostMedias.forEach(media => {
            if (!mediaMap.has(media.post_id)) {
                mediaMap.set(media.post_id, []);
            }
            mediaMap.get(media.post_id).push(media.dataValues || media);
        });

        // 6. Map data into final results
        return posts.map(post => ({
            ...post.dataValues || post,
            post_media: mediaMap.get(post.id) || [],
            comments_count: commentsMap.get(post.id)?.length || 0,
            user_infor: userMap.get(post.user_id) || null,
            comments: commentsMap.get(post.id) || []
        }));
    }

    async searchUsers(keyword) {
        return await usersService.getAllUsers({ full_name: keyword });
    }

    async createConversation(participants_id, conversation_type, name, avatar_url, created_by, last_message_id, last_message_at) {
        const conv = await conversationsService.createConversation(conversation_type, name, avatar_url, created_by, last_message_id, last_message_at);
        return {
            conv,
            participants: await participantsService.createParticipant(conv.id, participants_id),
            you: await participantsService.createParticipant(conv.id, created_by)
        }
    }
}

module.exports = new HomeService();
