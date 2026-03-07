const friendrequestsModel = require('../models/friendrequestsModel');

class FriendRequestsService {
    async getFriendRequests(receiver_id) {
        try {
            return await friendrequestsModel.findAll({
                where: {
                    receiver_id: receiver_id,
                    status: 'pending'
                }
            });
        } catch (error) {
            throw error;
        }
    }

    async createFriendRequest(sender_id, receiver_id, note) {
        try {
            const friendRequest = await friendrequestsModel.create({
                sender_id,
                receiver_id,
                note
            });
            return friendRequest;
        } catch (error) {
            throw error;
        }
    }

    async updateFriendRequestStatus(id, status) {
        try {
            return await friendrequestsModel.update(
                { status: status },
                {
                    where: {
                        id: id,
                    }
                }
            );
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new FriendRequestsService();