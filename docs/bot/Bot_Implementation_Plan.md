# Bot Platform Implementation Plan (Telegram-style)

## 1. Overview
Hệ thống cho phép người dùng tạo và vận hành Bot thông qua cơ chế Webhook và REST API. Server đóng vai trò trung gian (Relay) để chuyển tiếp tin nhắn giữa User và Bot Server.

## 2. Architecture (Queue-based Relay)
Để đảm bảo hiệu năng, hệ thống sử dụng mô hình Event-driven với Redis Queue.

### Sequence Flow:
1. **User -> Server:** Gửi tin nhắn qua Socket.IO.
2. **Server:** Kiểm tra người nhận có phải là Bot.
3. **Server -> Redis:** Nếu là Bot, đẩy thông tin tin nhắn vào `BotRelayQueue` (BullMQ).
4. **Worker:** Lấy dữ liệu từ Queue và thực hiện `POST` tới Webhook URL của Bot với Payload chuẩn (xem mục 2.1).
5. **Bot Server -> API:** Sau khi xử lý, Bot Server sẽ chủ động gọi vào Bot REST API (`/api/v1/bots/send-message`) kèm Token để gửi phản hồi. Webhook Response chỉ cần trả `200 OK`.
6. **Retry Policy:** Nếu Webhook không trả về `200 OK`, Worker sẽ tự động thử lại tối đa **5 lần** (với backoff delay). Sau 5 lần thất bại, Job bị hủy và lỗi được ghi vào log.

### 2.1. Webhook Payload (Worker gửi sang Bot Server)
```json
{
  "update_id": "UUID",
  "message": {
    "message_id": "UUID",
    "from": {
      "id": "UUID",
      "username": "String",
      "display_name": "String"
    },
    "chat": {
      "id": "UUID",
      "type": "private | group"
    },
    "text": "String (nội dung tin nhắn — đây là field Bot dùng để routing)",
    "timestamp": 1714800000
  }
}
```

## 3. Database Schema Changes

### Table: `users` (Updates)
- `bot_name`: VARCHAR(50) UNIQUE (Định danh của Bot, ví dụ: @weather_bot)
- `is_bot`: BOOLEAN (default: false)

### Table: `bots` (New)
- `id`: UUID (Primary Key)
- `bot_user_id`: UUID (FK to users.id — trỏ về user account của bot)
- `owner_id`: UUID (FK to users.id — người tạo ra bot)
- `token_hash`: STRING (Hashed version of the bot token)
- `webhook_url`: STRING (URL của Bot Server nhận tin nhắn)
- `status`: ENUM ('active', 'disabled')


## 4. BotFather (Management)
Người dùng tương tác với `@BotFather` để quản lý bot.
- `/newbot`: Tạo bot mới và nhận Token.
- `/setwebhook`: Cấu hình URL nhận dữ liệu.
- `/token`: Lấy/Làm mới Token.

## 5. Bot API (Response)
Bot sử dụng REST API để tương tác ngược lại với người dùng.

**Endpoint:** `POST /api/v1/bots/send-message`
**Auth:** `Authorization: Bearer <BOT_TOKEN>`
**Payload:**
```json
{
  "chat_id": "UUID",
  "text": "String",
  "reply_to_message_id": "UUID (Optional)"
}
```

## 6. Security & Privacy
- **No E2EE:** Các cuộc hội thoại với Bot sẽ không được mã hóa đầu cuối để Server có thể đọc và relay dữ liệu.
- **Privacy Mode (On):** Trong Group Chat, Bot chỉ nhận được tin nhắn khi:
    - Tin nhắn bắt đầu bằng `/` (Command).
    - Bot được `@mention`.
- **Token Hashing:** Token của Bot được lưu dưới dạng Hash trong DB để đảm bảo an toàn.

## 7. Implementation Steps (Roadmap)
1. **Giai đoạn 1:** Cập nhật Database Schema và tạo Model cho Bot.
2. **Giai đoạn 2:** Cài đặt BullMQ và viết Worker để relay tin nhắn qua Webhook.
3. **Giai đoạn 3:** Xây dựng Bot API để cho phép Bot gửi tin nhắn ngược lại.
4. **Giai đoạn 4:** Triển khai BotFather (Logic xử lý commands cơ bản).
5. **Giai đoạn 5:** Hoàn thiện giao diện UI cho Bot (Icon bot, tag "BOT" cạnh tên).
