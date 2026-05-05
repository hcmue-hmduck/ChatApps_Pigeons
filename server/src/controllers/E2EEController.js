const SuccessResponse = require('../core/successResponse.js');
const e2eeService = require('../services/E2EEService.js');

class E2EEController {
    async setupKeys(req, res, next) {
        const { id } = req.user;
        return new SuccessResponse({
            message: 'setup key successfully',
            metadata: await e2eeService.setupKeys(id, req.body),
        }).send(res);
    }

    async getKeys(req, res, next) {
        const { id } = req.user;
        return new SuccessResponse({
            message: 'get keys successfully',
            metadata: await e2eeService.getKeys(id),
        }).send(res);
    }

    async getPublicKeys(req, res, next) {
        const { participant_ids } = req.body;
        return new SuccessResponse({
            message: 'get public keys successfully',
            metadata: await e2eeService.getPublicKeys(participant_ids),
        }).send(res);
    }

    async addSharedKeys(req, res, next) {
        return new SuccessResponse({
            message: 'add shared keys successfully',
            metadata: await e2eeService.addSharedKeys(req.body),
        }).send(res);
    }

    async getSharedKey(req, res, next) {
        const { id } = req.user;
        return new SuccessResponse({
            message: 'ger shared key successfully',
            metadata: await e2eeService.getSharedKey(id, req.body),
        }).send(res);
    }

    async getSharedKeys(req, res, next) {
        const {id} = req.user;
         return new SuccessResponse({
            message: 'ger shared keys successfully',
            metadata: await e2eeService.getSharedKeys(id),
        }).send(res);
    }
}

module.exports = new E2EEController();
