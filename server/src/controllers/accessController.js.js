const accessService = require('../services/accessService.js');
const SuccessResponse = require('../core/successResponse.js');
const { setCookieTokens, clearCookieTokens } = require('../utils/authUtil.js');

class AccessController {
    // [POST] /access/signup
    async signup(req, res, next) {
        const results = await accessService.signup(req.body);
        const { accessToken, refreshToken } = results.tokens;
        setCookieTokens(res, accessToken, refreshToken);
        return new SuccessResponse({
            message: 'signup successfully',
            metadata: results.user,
        }).send(res);
    }

    // [POST] /access/login
    async login(req, res, next) {
        const results = await accessService.login(req.body);
        const { accessToken, refreshToken } = results.tokens;
        setCookieTokens(res, accessToken, refreshToken);
        return new SuccessResponse({
            message: 'login successfully',
            metadata: results.user,
        }).send(res);
    }

    // [POST] /access/logout
    async logout(req, res, next) {
        const { id, sid } = req.user;
        const result = await accessService.logout({ userId: id, sid });
        clearCookieTokens(res);
        return new SuccessResponse({
            message: 'logout successfully',
            metadata: result,
        }).send(res);
    }

    // [POST] /access/refresh-token
    async refreshToken(req, res, next) {
        const { id, sid, role } = req.user;
        const results = await accessService.refreshToken({ userId: id, sid, userRole: role });
        const { accessToken, refreshToken } = results.tokens;
        setCookieTokens(res, accessToken, refreshToken);
        return new SuccessResponse({
            message: 'refresh token successfully',
            metadata: results,
        }).send(res);
    }
}

module.exports = new AccessController();
