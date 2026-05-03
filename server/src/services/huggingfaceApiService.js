require('dotenv').config();
// Node.js v18+ đã có sẵn fetch và FormData natively, không cần node-fetch hay form-data

/**
 * Service to call our Custom AI Moderator hosted on Hugging Face Spaces.
 */

const BASE_URL = process.env.AI_MODERATOR_URL;

/**
 * Kiểm duyệt văn bản (Text Moderation)
 * @param {string} text - Nội dung cần kiểm duyệt
 * @returns {Promise<Object>} - Kết quả kiểm duyệt { isViolated, category, score, reason }
 */
async function moderateTextHF(text) {
    try {
        const response = await fetch(`${BASE_URL}/moderate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Cloud AI Server Error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Lỗi khi kiểm duyệt Text qua Cloud AI:", error.message);
        throw error;
    }
}

/**
 * Kiểm duyệt hình ảnh (Image Moderation)
 * @param {Buffer} imageBuffer - File ảnh dưới dạng Buffer
 * @param {string} filename - Tên file ảnh (tuỳ chọn)
 * @returns {Promise<Object>} - Kết quả kiểm duyệt { isViolated, category, score, reason }
 */
async function moderateImageHF(imageBuffer, filename = "image.jpg") {
    try {
        // Dùng native FormData + Blob (Node v18+) để tương thích với native fetch
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append("file", blob, filename);

        const response = await fetch(`${BASE_URL}/moderate-image`, {
            method: "POST",
            body: formData,
            // Header Content-Type tự động được set bởi native FormData (gồm boundary)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Cloud AI Server Error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Lỗi khi kiểm duyệt Image qua Cloud AI:", error.message);
        throw error;
    }
}

module.exports = {
    moderateTextHF,
    moderateImageHF
};
