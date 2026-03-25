const homeService = require('../services/homeService');
const SuccessResponse = require('../core/successResponse');

class HomeController {
    // [POST] /home/call/:convID
    async startHomeCall(req, res) {
        const conversation_id = req.params.convID;
        new SuccessResponse({
            message: 'Start home call successfully',
            metadata: await homeService.startCall({ conversation_id, ...req.body }),
        }).send(res);
    }

    // [POST] /home/call/logs-group-call/:convID
    async createLogJoinGroupCall(req, res) {
        const conversation_id = req.params.convID;
        const { user_id } = req.body;
        new SuccessResponse({
            message: 'Create log join group call successfully',
            metadata: await homeService.createLogJoinGroupCall({ conversation_id, user_id }),
        }).send(res);
    }

    // [PATCH] /home/call/ongoing/:callID
    async setCallOngoing(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Set call ongoing successfully',
            metadata: await homeService.setCallOngoing(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/completed/:callID
    async setCallCompleted(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Set call completed successfully',
            metadata: await homeService.setCallCompleted(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/decliend/:callID
    async setCallDecliend(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Set call declined successfully',
            metadata: await homeService.setCallDecliend(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/cancelled/:callID
    async setCallCancelled(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Set call cancelled successfully',
            metadata: await homeService.setCallCancelled(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/missed/:callID
    async setCallMissed(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Set call missed successfully',
            metadata: await homeService.setCallMissed(call_id),
        }).send(res);
    }

    // [PATCH] /home/call/ended/:callID
    async setCallEnded(req, res) {
        const call_id = req.params.callID;
        new SuccessResponse({
            message: 'Set call ended successfully',
            metadata: await homeService.endCall(call_id),
        }).send(res);
    }


    async getFriendRequests(req, res) {
        const receiverId = req.params.receiverId;
        const friendRequests = await homeService.getFriendRequests(receiverId);
        new SuccessResponse({
            message: 'Get friend requests successfully',
            metadata: {
                friendRequests: friendRequests,
            },
        }).send(res);
    }

    async getSentFriendRequests(req, res) {
        const senderId = req.params.senderId;
        const sentFriendRequests = await homeService.getSentFriendRequests(senderId);
        new SuccessResponse({
            message: 'Get sent friend requests successfully',
            metadata: {
                sentFriendRequests: sentFriendRequests,
            },
        }).send(res);
    }

    async createFriendRequest(req, res) {
        const { senderId, receiverId, note } = req.body;
        const newFriendRequest = await homeService.createFriendRequest(senderId, receiverId, note);
        new SuccessResponse({
            message: 'Create friend request successfully',
            metadata: {
                newFriendRequest: newFriendRequest,
            },
        }).send(res);
    }

    async updateFriendRequestStatus(req, res) {
        const id = req.params.id;
        const { status } = req.body;
        const updatedFriendRequest = await homeService.updateFriendRequestStatus(id, status);
        new SuccessResponse({
            message: 'Update friend request status successfully',
            metadata: {
                updatedFriendRequest: updatedFriendRequest,
            },
        }).send(res);
    }
}

module.exports = new HomeController();
