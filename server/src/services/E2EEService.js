const {BadRequestError} = require('../core/errorResponse.js')

class E2EEService {
    async setupKeys(user_id, {public_key, wrapped_private_key, kek_iv, pin_salt}) {
        if(!user_id || !public_key || !wrapped_private_key || !kek_iv || !pin_salt) 
            throw new BadRequestError('missing parameters');

        return true
    }
}

module.exports = new E2EEService();