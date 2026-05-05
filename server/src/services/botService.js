const { BadRequestError } = require('../core/errorResponse.js');
const botModel = require('../models/botsModel.js');
const userService = require('../services/usersService.js');
const { sequelize } = require('../configs/sequelizeConfig.js')
const { createTokenHash } = require('../utils/authUtil.js');
const { getUpdateData } = require('../utils/dataUtil.js');
const userModel = require('../models/usersModel.js');

class BotService {

    async get(owner_id) {
        
        const bots = await botModel.findAll({ 
            where: { owner_id },
            include: [{
                model: userModel,
                as: 'BotAccount',
                attributes: ['id', 'full_name', 'bot_name', 'avatar_url', 'is_bot']
            }]
        });

        // Format lại dữ liệu để front-end dễ dùng
        return bots.map(b => {
            const botJson = b.toJSON();
            return {
                ...botJson,
                full_name: botJson.BotAccount?.full_name,
                bot_name: botJson.BotAccount?.bot_name,
                avatar_url: botJson.BotAccount?.avatar_url
            };
        });
    }

    async getBotByUserId(bot_user_id) {
        const bot = await botModel.findOne({
            where: { bot_user_id },
            include: [
                {
                    model: userModel,
                    as: 'BotAccount',
                    attributes: ['id', 'full_name', 'bot_name', 'avatar_url']
                }
            ]
        });

        if (!bot) return null;
        
        const botJson = bot.toJSON();
        return {
            ...botJson,
            full_name: botJson.BotAccount?.full_name,
            bot_name: botJson.BotAccount?.bot_name,
            avatar_url: botJson.BotAccount?.avatar_url
        };
    }

    async callWebhook(bot_user_id, payload) {
        const bot = await botModel.findOne({ where: { bot_user_id } });
        if (!bot || !bot.webhook_url) {
            throw new BadRequestError('Bot does not exist or has no webhook URL');
        }

        // Google Apps Script thường redirect 302 -> phải dùng `redirect: 'follow'`
        const response = await fetch(bot.webhook_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Webhook failed [${response.status}]:`, errorText);
            throw new BadRequestError(`Webhook failed with status ${response.status}`);
        }

        try {
            const data = await response.json();
            return data;
        } catch (error) {
            // Google Apps Script có thể trả về text thay vì JSON
            console.warn("Webhook response is not JSON, returning raw text...");
            return { reply: null, raw: await response.text() };
        }
    }

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