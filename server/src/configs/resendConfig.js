const { Resend } = require('resend');
const {mail: {resendApiKey}} = require('../configs/index.js')

const resend = new Resend(resendApiKey);

module.exports = resend;