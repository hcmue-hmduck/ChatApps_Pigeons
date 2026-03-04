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

    async createFriend(friendData) {
        try {
            return await friendsModel.create(friendData);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new FriendsService();