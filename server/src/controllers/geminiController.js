const geminiService = require('../services/geminiService.js');
const SuccessResponse = require('../core/successResponse');

class GeminiController {
    async generateGeminiResponse(req, res) {
        const { prompt } = req.body;
        const response = await geminiService.generateGeminiResponse(prompt);
        console.log("Gemini response:", response);
        new SuccessResponse({
            message: 'Get request successfully',
            metadata: {
                response: response,
            }
        }).send(res)
    }
}

module.exports = new GeminiController();