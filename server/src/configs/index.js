const dev = {
    app: {
        frontendUrl: process.env.LINK_CLIENT,
        backendUrl: process.env.LINK_SERVER,
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
        clientId: process.env.GITHUB_CLIENT_ID_DEV,
        clientSecret: process.env.GITHUB_CLIENT_SECRET_DEV,
    },
    mail: {
        resendApiKey: process.env.RESEND_API_KEY,
        fromName: process.env.MAIL_FROM_NAME,
        fromAddress: process.env.MAIL_FROM_ADDRESS,
    },
};

const prod = {
    app: {
        frontendUrl: process.env.LINK_CLIENT_PROD,
        backendUrl: process.env.LINK_SERVER_PROD,
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
        clientId: process.env.GITHUB_CLIENT_ID_PROD,
        clientSecret: process.env.GITHUB_CLIENT_SECRET_PROD,
    },
    mail: {
        resendApiKey: process.env.RESEND_API_KEY,
        name: process.env.MAIL_FROM_NAME,
        address: process.env.MAIL_FROM_ADDRESS,
    },
};

const config = { dev, prod };
const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

module.exports = config[env];
