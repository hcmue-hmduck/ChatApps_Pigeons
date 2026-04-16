const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: "v1" });

const model = genAI.getGenerativeModel({ model: "gemini-2-flash" });

module.exports = {
    model
}