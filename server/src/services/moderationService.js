require('dotenv').config();
const {
    openAI: { modelAI, openRouterApiKey },
    app: { frontendUrl },
} = require('../configs/index.js');

const OpenAI = require('openai');

const MODERATION_PROMPT = `Bạn là một hệ thống kiểm duyệt nội dung cho mạng xã hội. 
Hãy phân tích nội dung sau và trả về JSON với cấu trúc:
{
  "isViolated": boolean (true nếu vi phạm, false nếu ok),
  "category": string (ví dụ: "hate_speech", "violence", "spam", "adult_content", "toxic_language", "clean"),
  "score": number (0-1, 0=an toàn, 1=nguy hiểm),
  "reason": string (lý do tóm tắt)
}

Tiêu chí kiểm duyệt:
- hate_speech: Khích động thù hận, phân biệt đối xử hoặc bạo lực
- violence: Nội dung bạo lực, đe dọa
- spam: Quảng cáo lặp lại, liên kết độc hại
- adult_content: Nội dung 18+ không phù hợp
- toxic_language: Chứa từ ngữ thô tục, chửi bậy, xúc phạm người khác (Chấm điểm từ 0.5 - 0.7)
- clean: Nội dung bình thường, an toàn

Nội dung cần kiểm duyệt:
`;

class ModerationService {
    #openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterApiKey,
        defaultHeaders: {
            'HTTP-Referer': frontendUrl,
            'X-OpenRouter-Title': 'Chat Pigeons',
        },
    });

    async moderateText(text) {
        try {
            if (!text || typeof text !== 'string') {
                return {
                    isViolated: false,
                    category: 'clean',
                    score: 0,
                    reason: 'Nội dung trống'
                };
            }

            const completion = await this.#openai.chat.completions.create({
                model: modelAI,
                messages: [
                    {
                        role: 'user',
                        content: MODERATION_PROMPT + JSON.stringify(text)
                    }
                ],
                max_tokens: 256,
                temperature: 0.3
            });

            const responseText = completion.choices[0]?.message?.content || '';
            
            // Parse JSON từ response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                return {
                    isViolated: result.isViolated ?? false,
                    category: result.category || 'unknown',
                    score: Number(result.score) || 0,
                    reason: result.reason || ''
                };
            }

            // Fallback nếu parse JSON thất bại
            console.warn('[Moderation] Could not parse JSON from response:', responseText);
            return {
                isViolated: false,
                category: 'unknown',
                score: 0.5,
                reason: 'Không thể phân tích'
            };
        } catch (error) {
            console.error('[Moderation] Error moderating text:', error.message);
            // Return safe default on error
            return {
                isViolated: false,
                category: 'error',
                score: 0,
                reason: 'Lỗi hệ thống, bỏ qua kiểm duyệt'
            };
        }
    }
}

module.exports = new ModerationService();
