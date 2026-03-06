const userblockService = require('../services/userblockServices');
const SuccessResponse = require('../core/successResponse');

class UserBlockController {
    async getUserBlocks(req, res) {
        try {
            const userBlocks = await userblockService.getUserBlocks(req.params.blockerId);
            new SuccessResponse({
                message: 'Get user blocks successfully',
                metadata: userBlocks,
                statusCode: 200,
                status: 'success'
            }).send(res);
        } catch (error) {
            new SuccessResponse({
                message: 'Get user blocks failed',
                metadata: null,
                statuscode: 500,
                status: 'failed'
            }).send(res);
        }
    }

    async createUserBlock(req, res) {
        try {
            const { blockerId, blockedId, reason } = req.body;
            const userBlock = await userblockService.createUserBlock(blockerId, blockedId, reason);
            new SuccessResponse({
                message: 'Create user block successfully',
                metadata: userBlock,
                statusCode: 200,
                status: 'success'
            }).send(res);
        } catch (error) {
            new SuccessResponse({
                message: 'Create user block failed',
                metadata: null,
                statuscode: 500,
                status: 'failed'
            }).send(res);
        }
    }

    async deleteUserBlock(req, res) {
        try {
            const userBlock = await userblockService.deleteUserBlock(req.params.id);
            new SuccessResponse({
                message: 'Delete user block successfully',
                metadata: userBlock,
                statusCode: 200,
                status: 'success'
            }).send(res);
        } catch (error) {
            new SuccessResponse({
                message: 'Delete user block failed',
                metadata: null,
                statuscode: 500,
                status: 'failed'
            }).send(res);
        }
    }
}

module.exports = new UserBlockController();