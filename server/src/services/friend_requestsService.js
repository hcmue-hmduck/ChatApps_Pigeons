const friendrequestsModel = require('../models/friendrequestsModel');
const usersService = require('./usersService');
const { Op } = require('sequelize');

class FriendRequestsService {
    async _getPairRequests(userA, userB) {
        return await friendrequestsModel.findAll({
            where: {
                [Op.or]: [
                    { sender_id: userA, receiver_id: userB },
                    { sender_id: userB, receiver_id: userA },
                ],
            },
            order: [['created_at', 'ASC']],
        });
    }

    async _normalizePairRequest(userA, userB, note) {
        const requests = await this._getPairRequests(userA, userB);
        if (!requests.length) return null;

        // Prefer the row already in the same direction as the new request.
        const keeper = requests.find(
            (r) => String(r.sender_id) === String(userA) && String(r.receiver_id) === String(userB),
        ) || requests[0];

        const duplicateIds = requests
            .filter((r) => String(r.id) !== String(keeper.id))
            .map((r) => r.id);

        if (duplicateIds.length) {
            await friendrequestsModel.destroy({ where: { id: duplicateIds } });
        }

        return await keeper.update({
            sender_id: userA,
            receiver_id: userB,
            status: 'pending',
            note,
        });
    }

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

    async getSentFriendRequest(sender_id) {
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

    async getSentFriendRequests(senderId) {
        const friendRequests = await this.getSentFriendRequest(senderId);
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

    async createFriendRequest(sender_id, receiver_id, note) {
        try {
            const normalizedSenderId = String(sender_id || '').trim();
            const normalizedReceiverId = String(receiver_id || '').trim();
            const normalizedNote = note == null ? '' : String(note);

            if (!normalizedSenderId || !normalizedReceiverId) {
                throw new Error('sender_id and receiver_id are required');
            }

            const normalizedExisting = await this._normalizePairRequest(
                normalizedSenderId,
                normalizedReceiverId,
                normalizedNote,
            );
            if (normalizedExisting) return normalizedExisting;

            try {
                return await friendrequestsModel.create({
                    sender_id: normalizedSenderId,
                    receiver_id: normalizedReceiverId,
                    note: normalizedNote,
                });
            } catch (error) {
                if (error?.name === 'SequelizeUniqueConstraintError') {
                    const normalizedAfterConflict = await this._normalizePairRequest(
                        normalizedSenderId,
                        normalizedReceiverId,
                        normalizedNote,
                    );
                    if (normalizedAfterConflict) return normalizedAfterConflict;
                }
                throw error;
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