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
}

module.exports = new BotController();