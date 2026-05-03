const OpenAiService = require('../services/openAiService') 
const successResponse = require('../core/successResponse')

class openAiController {
    async sendMessageToAI(req, res) {
        const { userMessage } = req.body;

        if (!userMessage) {
            return new successResponse({
            message: 'AI response fetched failed',
            metadata: {
                answer: 'No user message provided',
            },
            }).send(res);
        }

        const answer = await OpenAiService.askAI(userMessage);

        return new successResponse({
            message: 'AI response fetched successfully',
            metadata: {
                answer,
            },
        }).send(res);
    }
}

module.exports = new openAiController();