const dotenv = require('dotenv');
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = process.env.OPENROUTER_URL;
const CHAT_MODEL = process.env.CHAT_MODEL;


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

    async *summarizeMessages(messages = []) {
        if (!messages || messages.length === 0) {
            yield 'Hiện chưa có tin nhắn chưa đọc để tóm tắt.';
            return;
        }

        const request = buildSummarizeRequest(messages);

        try {
            const stream = await this.#openai.chat.completions.create({
                model: modelAI,
                messages: [
                    {
                        role: 'user',
                        content: JSON.stringify(request),
                    },
                ],
                stream: true
            });

            for await (const churn of stream) {
                const content = churn?.choices?.[0]?.delta?.content
                if (content) yield content
            }
        } catch (error) {
            throw error;
        }
    }
    async chatWithBot(userMessage) {
        try {
            const completion = await this.#openai.chat.completions.create({
                model: modelAI,
                messages: [
                    {
                        role: 'user',
                        content: `[Trả lời ngắn gọn bằng tiếng Việt] ${userMessage}`,
                    },
                ],
                max_tokens: 512,
            });
            return completion.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.';
        } catch (error) {
            console.error('❌ OpenRouter chatWithBot error:', error.message);
            return 'Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.';
        }
    }


    async askAI(message) {
        console.log('Message', message);
        const res = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: CHAT_MODEL,
                messages: [
                    { role: "user", content: `[Trả lời ngắn gọn bằng tiếng Việt] ${message}` }
                ],
                max_tokens: 300,
            })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`OpenRouter lỗi ${res.status}: ${err}`);
        }

        const data = await res.json();
        return data.choices[0].message.content;
    }
}

module.exports = new OpenAiService();
