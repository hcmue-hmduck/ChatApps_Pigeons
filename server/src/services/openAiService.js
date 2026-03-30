const OpenAI = require('openai');
const {
    openAI: { modelAI, openRouterApiKey },
    app: { frontendUrl },
} = require('../configs/index.js');

const promptSummarizeMessagesTemplate = {
    task: 'summarize_messages',
    instruction: 'Tóm tắt cuộc trò chuyện một cách ngắn gọn nhất, chỉ giữ lại thông tin thiết yếu.',
    requirements: {
        language: 'Vietnamese',
        tone: 'professional',
        max_length: '50-80 words',
        style: 'bullet points hoặc 3-4 câu ngắn',
        focus_on: [
            'Chủ đề chính của cuộc thảo luận',
            'Quyết định hoặc hành động quan trọng',
            'Tài liệu hoặc tệp quan trọng được chia sẻ',
        ],
    },
    format_output: {
        type: 'plain text',
        structure: 'bullet points (không cần markdown headers)',
    },
    rules: {
        do: [
            'Liệt kê chủ đề chính',
            'Ghi nhận những quyết định hoặc hành động',
            'Nhắc tên sender khi cần thiết để làm rõ ai đã nói gì',
        ],
        dont: [
            'Không phân tích chi tiết từng tin nhắn',
            'Không bình luận về emoji/sticker',
            'Không lặp lại cùng một vấn đề nhiều lần',
            'Không dùng cấu trúc phức tạp',
            'Không liệt kê danh sách thành viên tham gia',
        ],
    },
    ignore_items: [
        'Các phản ứng emoji/sticker không mang thông tin quan trọng',
        'Các tin nhắn trùng lặp hoặc không có nội dung thực',
        'Các câu trả lời ngắn (ví dụ: "ok", "được")',
    ],
    note: "Các tin nhắn có trường 'reply_to' cho biết người gửi đang trả lời tin nhắn cụ thể. Chỉ ghi chú nếu nó liên quan đến quyết định hoặc thông tin quan trọng.",
};

function buildSummarizeRequest(messages) {
    return {
        ...promptSummarizeMessagesTemplate,
        messages: Array.isArray(messages) ? messages : [],
    };
}

class OpenAiService {
    #openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterApiKey,
        defaultHeaders: {
            'HTTP-Referer': frontendUrl, // Optional. Site URL for rankings on openrouter.ai.
            'X-OpenRouter-Title': 'Chat Pigeons', // Optional. Site title for rankings on openrouter.ai.
        },
    });

    async summarizeMessages(messages) {
        if (!messages || messages.lenght === 0) return null;

        const request = buildSummarizeRequest(messages);

        try {
            const completion = await this.#openai.chat.completions.create({
                model: modelAI,
                messages: [
                    {
                        role: 'user',
                        content: JSON.stringify(request),
                    },
                ],
            });

            return completion?.choices?.[0]?.message?.content || '';
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new OpenAiService();
