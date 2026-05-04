const { BadRequestError } = require('../core/errorResponse.js');
const botModel = require('../models/botsModel.js');
const userService = require('../services/usersService.js');
const { sequelize } = require('../configs/sequelizeConfig.js')
const { createTokenHash } = require('../utils/authUtil.js');
const { getUpdateData } = require('../utils/dataUtil.js');
const usersService = require('../services/usersService.js');

class BotService {
    async create(full_name, bot_name, owner_id) {
        return await sequelize.transaction(async (t) => {
            const newBotUser = await userService.createBotUser(full_name, bot_name, { transaction: t });
            if (!newBotUser) throw new BadRequestError();

            const bot_user_id = newBotUser.id;
            const token_hash = await createTokenHash();

            const newBotConfig = await botModel.create({
                bot_user_id,
                owner_id,
                token_hash
            }, { transaction: t });

            return newBotConfig;
        })
    }

    async update(botId, payload) {
        const updateData = getUpdateData(payload);
        const { full_name, bot_name, ...configs } = updateData;
        const updatePromises = [];
        const foundBot = await botModel.findByPk(botId)
        if (!foundBot) throw BadRequestError(`bot doesn't exists`);

        return await sequelize.transaction(async (t) => {
            if (full_name || bot_name) {
                const botUserId = foundBot.bot_user_id;
                updatePromises.push(
                    userService.updateBotUser(botUserId, { full_name, bot_name }, { transaction: t })
                );
            }

            updatePromises.push(
                foundBot.update(configs, { transaction: t })
            );

            const result = await Promise.all(updatePromises);
            return result;
        })
    }
}

module.exports = new BotService();