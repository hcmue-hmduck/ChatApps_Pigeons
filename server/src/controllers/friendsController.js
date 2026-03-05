const FriendsService = require('../services/friendsService');
const SuccessResponse = require('../core/successResponse');

class FriendsController {
    async getFriendByUserId(req, res) {
        const userId = req.params.userId;
        const friends = await FriendsService.getFriendByUserId(userId);
        new SuccessResponse({
            message: 'Get friends successfully',
            metadata: friends,
        }).send(res)
    }
}

module.exports = new FriendsController();

