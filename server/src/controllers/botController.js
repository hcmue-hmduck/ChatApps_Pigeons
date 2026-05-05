const SuccessResponse = require("../core/successResponse.js");
const botService = require('../services/botService.js')


class BotController {
    async create(req, res, next) {
        const {id} = req.user;
        const {full_name, bot_name} = req.body; // full_name is display name
        return new SuccessResponse({
            message: 'create bot successfully',
            metadata: await botService.create(full_name, bot_name, id)
        }).send(res);
    }

    async update(req, res, next) {
        const botId = req.params.bot_id;
        return new SuccessResponse({
            message: 'update bot successfully',
            metadata: await botService.update(botId, req.body)
        }).send(res);
    }

    async delete(req, res, next) {
        const botId = req.params.bot_id;
        return new SuccessResponse({
            message: 'delete bot successfully',
            metadata: await botService.delete(botId)
        }).send(res);
    }

    async get(req, res) {
        const {id} = req.user;
        return new SuccessResponse({
            message: 'get bot successfully',
            metadata: await botService.get(id)
        }).send(res);
    }

    async getBotByUserId(req, res) {
        const {bot_user_id} = req.params;
        return new SuccessResponse({
            message: 'get bot successfully',
            metadata: await botService.getBotByUserId(bot_user_id)
        }).send(res);
    }

    async callWebhook(req, res, next) {
        try {
            const {bot_user_id} = req.params;
            const payload = req.body;
            const webhookRes = await botService.callWebhook(bot_user_id, payload);
            
            return new SuccessResponse({
                message: 'call webhook successfully',
                metadata: webhookRes
            }).send(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new BotController();