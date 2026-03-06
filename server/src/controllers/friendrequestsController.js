const friendrequestsService = require('../services/friendrequestsService');
const SuccessResponse = require('../core/successResponse');

class FriendRequestsController {
    async getFriendRequests(req, res) {
        try {
            const friendRequests = await friendrequestsService.getFriendRequests(req.params.receiverId);
            new SuccessResponse({
                message: 'Get friend requests successfully',
                metadata: friendRequests,
                statusCode: 200,
                status: 'success'
            }).send(res);
        } catch (error) {
            new SuccessResponse({
                message: 'Get friend requests failed',
                metadata: null,
                statuscode: 500,
                status: 'failed'
            }).send(res);
        }
    }

    async createFriendRequest(req, res) {
        try {
            const { senderId, receiverId, reason } = req.body;
            const friendRequest = await friendrequestsService.createFriendRequest(senderId, receiverId, reason);
            new SuccessResponse({
                message: 'Create friend request successfully',
                metadata: friendRequest,
                statusCode: 200,
                status: 'success'
            }).send(res);
        } catch (error) {
            new SuccessResponse({
                message: 'Create friend request failed',
                metadata: null,
                statuscode: 500,
                status: 'failed'
            }).send(res);
        }
    }

    async updateFriendRequestStatus(req, res) {
        try {
            const friendRequest = await friendrequestsService.updateFriendRequestStatus(req.params.receiverId, req.body.status);
            new SuccessResponse({
                message: 'Update friend request status successfully',
                metadata: friendRequest,
                statusCode: 200,
                status: 'success'
            }).send(res);
        } catch (error) {
            new SuccessResponse({
                message: 'Update friend request status failed',
                metadata: null,
                statuscode: 500,
                status: 'failed'
            }).send(res);
        }
    }
}

module.exports = new FriendRequestsController();