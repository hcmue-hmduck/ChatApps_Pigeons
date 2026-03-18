const userService = require('./usersService.js');
const redisService = require('./redisService.js');
const emailService = require('./emailService.js');
const { BadRequestError, ConflictResqueseError, NotFoundError } = require('../core/errorResponse.js');
const { hashPassword, createKey, signJWT } = require('../utils/authUtil.js');
const crypto = require('crypto');

class AccessService {
    async signup({ full_name, email, password }) {
        if (!full_name || !email || !password) throw new BadRequestError('missing parameters');

        const foundUser = await userService.getUserByEmail(email);
        if (foundUser) throw new ConflictResqueseError('Email has already');

        const password_hash = await hashPassword(password);
        const newUser = await userService.createUser({ full_name, email, password_hash, is_email_verified: true });
        if (!newUser) return null;

        const { id, role, avatar_url } = newUser;
        const tokens = await this.#createSession(id, role);

        return {
            user: { id, role, full_name, avatar_url, email },
            tokens,
        };
    }

    async login(user) {
        if (!user) throw new BadRequestError('missing parameters');

        const { id, role, full_name, avatar_url, email } = user;
        const tokens = await this.#createSession(id, role);

        return {
            user: { id, role, full_name, avatar_url, email },
            tokens,
        };
    }

    async logout({ userId, sid }) {
        if (!userId || !sid) throw new BadRequestError('missing parameters');
        await redisService.deleteUserSession(userId, sid);
    }

    async refreshToken({ userId, userRole, sid }) {
        if (!userId || !userRole || !sid) throw new BadRequestError('missing parameters');
        const tokens = await this.#updateSession(userId, userRole, sid);
        return {
            user: { id: userId },
            tokens,
        };
    }

    async requestSignupOTP({ email, name }) {
        if (!email || !name) throw new BadRequestError('missing parameters');

        const foundUser = await userService.getUserByEmail(email);
        if (foundUser) throw new ConflictResqueseError('email has already');

        const otp = String(crypto.randomInt(100000, 1000000));
        const data = await emailService.sendSignupOTP(email, name, otp);
        await redisService.setOTP(email, otp);

        return data;
    }

    async verifySignupOTP({ email, otp }) {
        if (!email || !otp) throw new BadRequestError('missing parameters');

        const code = await redisService.getOTP(email);
        if (!code) throw new NotFoundError('not found otp');

        const isMatch = code === String(otp);
        if (!isMatch) throw new BadRequestError('otp mismatch');

        await redisService.deleteOTP(email);

        return isMatch;
    }

    async #createSession(userId, userRole) {
        const sid = crypto.randomUUID();
        const { accessPair, refreshPair } = this.#createPairTokens({
            uid: userId,
            role: userRole,
            sid,
        });

        const timeToLiveSecond = 60 * 60 * 24 * 7;
        await redisService.setUserSession({
            userId,
            sid,
            accessTokenSecret: accessPair.secretKey,
            refreshTokenSecret: refreshPair.secretKey,
            timeToLiveSecond,
        });

        return { accessToken: accessPair.token, refreshToken: refreshPair.token };
    }

    async #updateSession(userId, userRole, sid) {
        const { accessPair, refreshPair } = this.#createPairTokens({
            uid: userId,
            role: userRole,
            sid,
        });

        const timeToLiveSecond = 60 * 60 * 24 * 7;
        await redisService.updateUserSession({
            userId,
            sid,
            accessTokenSecret: accessPair.secretKey,
            refreshTokenSecret: refreshPair.secretKey,
            timeToLiveSecond,
        });

        return { accessToken: accessPair.token, refreshToken: refreshPair.token };
    }

    #createPairTokens(payload) {
        const secretKey1 = createKey();
        const secretKey2 = createKey();
        const accessToken = signJWT(payload, secretKey1, '30m');
        const refreshToken = signJWT(payload, secretKey2, '7d');

        return {
            accessPair: {
                token: accessToken,
                secretKey: secretKey1,
            },
            refreshPair: {
                token: refreshToken,
                secretKey: secretKey2,
            },
        };
    }
}

module.exports = new AccessService();
