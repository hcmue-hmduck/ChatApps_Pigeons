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

    async getSentFriendRequests(sender_id) {
        try {
            return await friendrequestsModel.findAll({
                where: {
                    sender_id: sender_id,
                    status: 'pending'
                }
            });
        } catch (error) {
            throw error;
        }
    }

    async createFriendRequest(sender_id, receiver_id, note) {
        try {
            const existingRequest = await friendrequestsModel.findOne({
                where: {
                    sender_id: sender_id,
                    receiver_id: receiver_id,
                }
            });
            if (existingRequest) {
                // Return updated instance
                return await existingRequest.update({
                    status: 'pending',
                    note
                });
            } else {
                // Return created instance
                return await friendrequestsModel.create({
                    sender_id,
                    receiver_id,
                    note
                });
            }
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