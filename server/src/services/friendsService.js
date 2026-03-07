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

    async createFriendByUserId(userId, friend_id, friendship_date, is_favorite, notes) {
        try {
            return await friendsModel.create({
                user_id: userId,
                friend_id: friend_id,
                friendship_date: friendship_date,
                is_favorite: is_favorite,
                notes: notes
            });
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new FriendsService();