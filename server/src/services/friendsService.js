const friendsModel = require('../models/friendsModel');

class FriendsService {
    async getFriendByUserId(userId) {
        try {
            return await friendsModel.findAll({
                where: {
                    user_id: userId
                }
            })
        }
        catch (error) {
            throw error;
        }
    }

    async createFriendByUserId(userId, friend_id, is_favorite, notes) {
        try {
            const userReq = await friendsModel.create({
                user_id: userId,
                friend_id: friend_id,
                is_favorite: is_favorite,
                notes: notes
            });

            const otherReq = await friendsModel.create({
                user_id: friend_id,
                friend_id: userId,
                is_favorite: is_favorite,
                notes: notes
            });
            return { userReq, otherReq };
        } catch (error) {
            throw error;
        }
    }

    async deleteFriendByUserId(userId, friend_id) {
        try {
            const userReq = await friendsModel.destroy({
                where: {
                    user_id: userId,
                    friend_id: friend_id
                }
            });

            const otherReq = await friendsModel.destroy({
                where: {
                    user_id: friend_id,
                    friend_id: userId
                }
            });
            return { userReq, otherReq };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new FriendsService();