const https = require('https');

const ONE_SIGNAL_HOST = 'api.onesignal.com';
const ONE_SIGNAL_PATH = '/notifications';

const postJson = (path, payload, apiKey) =>
    new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);

        const request = https.request(
            {
                hostname: ONE_SIGNAL_HOST,
                path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Content-Length': Buffer.byteLength(body),
                    Authorization: `Basic ${apiKey}`,
                },
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const status = res.statusCode || 0;
                    if (status >= 200 && status < 300) {
                        try {
                            resolve({ status, data: JSON.parse(data) });
                        } catch (error) {
                            resolve({ status, data: { raw: data } });
                        }
                        return;
                    }

                    reject(new Error(`OneSignal error ${status}: ${data}`));
                });
            },
        );

        request.on('error', reject);
        request.write(body);
        request.end();
    });

const sendNotification = async ({ headings, contents, externalUserIds, data, url }) => {
    try {
        const appId = process.env.ONESIGNAL_APP_ID;
        const apiKey = process.env.ONESIGNAL_REST_API_KEY;

        if (!appId || !apiKey) return null;
        if (!Array.isArray(externalUserIds) || externalUserIds.length === 0) return null;

        const payload = {
            app_id: appId,
            include_external_user_ids: externalUserIds,
            headings,
            contents,
            data,
        };

        if (url) {
            payload.url = url;
        }

        const response = await postJson(ONE_SIGNAL_PATH, payload, apiKey);
        console.log('[OneSignal] Push sent', {
            status: response?.status,
            recipients: externalUserIds.length,
            notificationId: response?.data?.id,
            recipientsCount: response?.data?.recipients,
            externalUserIds,
        });
        return response;
    } catch (error) {
        console.warn('[OneSignal] Push failed', error?.message || error);
        throw error
    }
};

module.exports = {
    sendNotification,
};
