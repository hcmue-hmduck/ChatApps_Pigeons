const { model } = require('../configs/geminiConfig.js');

class GeminiService {
    async generateGeminiResponse(prompt) {
        try {
            const responses = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 1000 }
            });

            // const litsModel = await model.listModels();
            // console.log("Model details:", litsModel);

            return responses.response.text();
        } catch (error) {
            console.error("Error generating Gemini response:", error);
            throw error;
        }
    }
}

module.exports = new GeminiService();