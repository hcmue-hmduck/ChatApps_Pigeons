const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
const SuccessResponse = require('../core/successResponse.js');
const { Json } = require('sequelize/lib/utils');

const router = express.Router();
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

const createAcessToken = async (roomId, participantId, participantName, participantAvatarUrl) => {
    const at = new AccessToken(apiKey, apiSecret, {
        identity: participantId,
        metadata: JSON.stringify({
            participantName,
            participantAvatarUrl,
        }),
    });
    at.addGrant({
        roomJoin: true,
        room: roomId,
        canPublish: true,
        canSubscribe: true,
    });

    const token = await at.toJwt();
    return token;
};

// [POST] lấy access token để tham gia vào room
router.get('/access-token', async (req, res, next) => {
    const { conversationId, userId, userName, userAvatarUrl } = req.query;
    if (!conversationId || !userId || !userName || !userAvatarUrl) throw new Error('Bad request');
    const token = await createAcessToken(conversationId, userId, userName, userAvatarUrl);
    return new SuccessResponse({
        message: 'Get access token success',
        metadata: { token },
    }).send(res);
});

module.exports = router;
