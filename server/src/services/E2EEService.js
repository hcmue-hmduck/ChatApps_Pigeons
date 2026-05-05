const { BadRequestError } = require('../core/errorResponse.js');
const userModel = require('../models/usersModel.js');
const conversationKeysVaultModel = require('../models/conversationkeysvaultModel.js');

class E2EEService {
    async setupKeys(user_id, { public_key, wrapped_private_key, kek_iv, pin_salt }) {
        if (!user_id || !public_key || !wrapped_private_key || !kek_iv || !pin_salt)
            throw new BadRequestError('missing parameters');

        const foundUser = await userModel.findByPk(user_id);
        if (!foundUser) throw BadRequestError('user not found');

        return await foundUser.update({
            public_key,
            wrapped_private_key,
            kek_iv,
            pin_salt,
        });
    }

    async getKeys(user_id) {
        if (!user_id) throw new BadRequestError('missing parameters');
        const foundUser = await userModel.findByPk(user_id);
        if (!foundUser) throw new BadRequestError('user not found');

        const { wrapped_private_key, kek_iv, pin_salt, public_key } = foundUser;
        if (!wrapped_private_key || !kek_iv || !pin_salt || !public_key) throw new BadRequestError(`missing key`);

        return {
            public_key,
            wrapped_private_key,
            kek_iv,
            pin_salt,
        };
    }

    async getPublicKeys(userIds) {
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0)
            throw new BadRequestError('missing parameters');

        return await userModel.findAll({
            where: { id: userIds },
            attributes: ['id', 'public_key'],
            raw: true,
        });
    }

    async addSharedKeys({ shared_keys_vault }) {
        if (!shared_keys_vault || !Array.isArray(shared_keys_vault) || shared_keys_vault.length === 0)
            throw new BadRequestError('invalid parameters');

        const validField = ['user_id', 'conversation_id', 'wrapped_shared_key', 'key_version'];
        shared_keys_vault.forEach((vault) => {
            const keys = Object.keys(vault);
            if (keys.length !== validField.length) throw new BadRequestError('Invalid number of fields in vault entry');

            keys.forEach((key) => {
                if (!validField.includes(key)) throw new BadRequestError(`Invalid field detected: ${key}`);
            });
        });

        // Kiểm tra xem Version khóa này đã tồn tại trong phòng này chưa
        const { conversation_id, key_version } = shared_keys_vault[0];
        const isExist = await conversationKeysVaultModel.findOne({
            where: { conversation_id, key_version },
        });

        if (isExist) {
            throw new BadRequestError(`Keys for version ${key_version} already exist in this conversation.`);
        }

        return await conversationKeysVaultModel.bulkCreate(shared_keys_vault);
    }

    async getSharedKey(user_id, { conversation_id, key_version }) {
        if (!user_id || !conversation_id || !key_version) throw new BadRequestError('invalid parmameters');

        const foundKey = await conversationKeysVaultModel.findOne({
            where: { user_id, conversation_id, key_version },
            attributes: ['wrapped_shared_key', 'key_version'],
            raw: true,
        });

        if (!foundKey) throw new BadRequestError('shared key not found');
        return foundKey;
    }

    async getSharedKeys(user_id) {
        if (!user_id) throw new BadRequestError('invalid parameters');

        return await conversationKeysVaultModel.findAll({
            where: { user_id },
            attributes: {
                exclude: ['id', 'user_id', 'updated_at', 'created_at'],
            },
            raw: true,
        });
    }
}

module.exports = new E2EEService();
