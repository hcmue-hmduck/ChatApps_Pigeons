const usersService = require('./usersService');
const participantsService = require('./participantsService');
const messagesService = require('./messagesService');
const pinnedmessagesService = require('./pinnedmessagesService');
const friendsService = require('./friendsService');
const friendrequestsService = require('./friend_requestsService.js');
const linkpreviewService = require('./linkpreviewService');

const { sequelize } = require('../configs/sequelizeConfig.js');
const callService = require('./callService.js');
const { CALL_STATUS } = require('../constants/call.constants.js');

class HomeService {

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

    async deleteFriendByUserId(userId, friend_id) {
        return await friendsService.deleteFriendByUserId(userId, friend_id);
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
}

module.exports = new HomeService();
