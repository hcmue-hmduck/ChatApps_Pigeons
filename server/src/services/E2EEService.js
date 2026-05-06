const { BadRequestError, E2EEErrorCode } = require('../core/errorResponse.js');
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

    async getPublicKeys({ participant_ids }) {
        if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0)
            throw new BadRequestError('missing parameters');

        return await userModel.findAll({
            where: { id: participant_ids },
            attributes: ['id', 'public_key'],
            raw: true,
        });
    }

    async getLatestConversationKey(conversation_id) {
        if (!conversation_id) throw new BadRequestError('invalid parameters');
        return await conversationKeysVaultModel.findOne({
            where: { conversation_id },
            order: [['key_version', 'DESC']],
        });
    }

    async addConversationKeys({ conversation_key_vaults }) {
        if (!conversation_key_vaults || !Array.isArray(conversation_key_vaults) || conversation_key_vaults.length === 0)
            throw new BadRequestError('invalid parameters');

        const validField = ['user_id', 'conversation_id', 'wrapped_shared_key', 'key_version'];
        conversation_key_vaults.forEach((vault) => {
            const keys = Object.keys(vault);
            if (keys.length !== validField.length) throw new BadRequestError('Invalid number of fields in vault entry');

            keys.forEach((key) => {
                if (!validField.includes(key)) throw new BadRequestError(`Invalid field detected: ${key}`);
            });
        });

        const { conversation_id, key_version } = conversation_key_vaults[0];

        const latestSharedKey = await this.getLatestConversationKey(conversation_id);

        const latestKeyVersion = latestSharedKey?.key_version ? latestSharedKey.key_version : 0;

        if (key_version !== latestKeyVersion + 1) {
            throw new BadRequestError(
                `Keys for version ${key_version} invalid in this conversation.`,
                undefined,
                E2EEErrorCode.SERVER_KEY_VERSION_MISMATCH,
            );
        }

        return await conversationKeysVaultModel.bulkCreate(conversation_key_vaults);
    }

    async getConversationKey(user_id, conversation_id, key_version) {
        if (!user_id || !conversation_id || !key_version) throw new BadRequestError('invalid parmameters');

        const foundKey = await conversationKeysVaultModel.findOne({
            where: { user_id, conversation_id, key_version },
            attributes: ['wrapped_shared_key', 'key_version'],
            raw: true,
        });

        if (!foundKey) throw new BadRequestError('shared key not found');
        return foundKey;
    }

    async getConversationKeys(user_id) {
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
