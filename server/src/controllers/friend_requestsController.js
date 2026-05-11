const friendrequestsService = require('../services/friend_requestsService');
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
            const senderId = req.body?.senderId || req.body?.sender_id;
            const receiverId = req.body?.receiverId || req.body?.receiver_id;
            const note = req.body?.note ?? req.body?.reason ?? '';

            if (!senderId || !receiverId) {
                return res.status(400).json({
                    message: 'senderId and receiverId are required',
                    metadata: null,
                    code: 400,
                });
            }

            if (String(senderId) === String(receiverId)) {
                return res.status(400).json({
                    message: 'Cannot send friend request to yourself',
                    metadata: null,
                    code: 400,
                });
            }

            const friendRequest = await friendrequestsService.createFriendRequest(senderId, receiverId, note);
            new SuccessResponse({
                message: 'Create friend request successfully',
                metadata: {
                    friendRequest,
                },
                statusCode: 200,
                status: 'success'
            }).send(res);
        } catch (error) {
            console.error('[FriendRequestsController] createFriendRequest error:', {
                body: req.body,
                message: error?.message,
                name: error?.name,
                parent: error?.parent?.detail || error?.parent?.message,
            });
            new SuccessResponse({
                message: 'Create friend request failed',
                metadata: null,
                statuscode: 500,
                status: 'failed'
            }).send(res);
        }
    }

    async updateFriendRequestStatus(req, res) {
        const id = req.params.id;
        const { status } = req.body;
        const updatedFriendRequest = await friendrequestsService.updateFriendRequestStatus(id, status);
        new SuccessResponse({
            message: 'Update friend request status successfully',
            metadata: {
                updatedFriendRequest: updatedFriendRequest,
            },
        }).send(res);
    }

    async getSentFriendRequests(req, res) {
        const senderId = req.params.senderId;
        const sentFriendRequests = await friendrequestsService.getSentFriendRequests(senderId);
        new SuccessResponse({
            message: 'Get sent friend requests successfully',
            metadata: {
                sentFriendRequests: sentFriendRequests,
            },
        }).send(res);
    }
}

module.exports = new FriendRequestsController();