# Tài liệu Hướng dẫn sử dụng Chức năng Tạo Bot (ChatApps_Pigeons)

Tài liệu này hướng dẫn chi tiết cách tạo, quản lý và viết script cho Bot trong hệ thống ChatApps_Pigeons. Hệ thống sử dụng cơ chế Webhook để giao tiếp với Bot Server của bạn.

---

## 1. Quy trình Tạo Bot bằng BotFather

Hệ thống sử dụng một Bot hệ thống đặc biệt tên là `@botfather` để quản lý việc tạo và cấu hình các bot khác.

### Bước 1: Tìm và trò chuyện với BotFather
- Tìm kiếm tài khoản `@botfather` trong hệ thống và mở cửa sổ chat.

### Bước 2: Bắt đầu tạo bot
- Gửi lệnh `/newbot` vào ô chat.
- BotFather sẽ phản hồi: *"Alright, a new bot. How are we going to call it? Please choose a name for your bot."*

### Bước 3: Đặt tên hiển thị (Display Name)
- Nhập tên hiển thị bạn muốn đặt cho Bot (Ví dụ: `Bot Thời Tiết`).

### Bước 4: Đặt Username cho Bot (**BẮT BUỘC**)
- BotFather sẽ yêu cầu bạn nhập username.
- **Quy tắc bắt buộc:** Username **phải kết thúc bằng chữ "bot"** (không phân biệt hoa thường). Ví dụ: `TetrisBot` hoặc `tetris_bot`.
- Nếu username hợp lệ và chưa được sử dụng, bot sẽ được tạo thành công.

---

## 2. Quản lý và Chỉnh sửa Bot

### Xem danh sách Bot
- Gửi lệnh `/mybots` cho `@botfather`.
- Hệ thống sẽ hiển thị danh sách các bot bạn đã tạo dưới dạng các nút bấm.

### Chỉnh sửa Bot
- Click vào tên bot bạn muốn chỉnh sửa từ danh sách.
- Nhấn nút `✏️ Edit`. Hệ thống sẽ cho phép bạn sửa các thông tin sau:
    1. **Display Name**: Tên hiển thị của bot.
    2. **Bio**: Mô tả ngắn về bot.
    3. **Webhook URL**: Đây là địa chỉ URL (API) do bạn tự dựng để xử lý logic của bot. Hệ thống sẽ gửi tin nhắn đến URL này.

---

## 3. Xoá Bot

- Gửi lệnh `/mybots` và chọn bot cần xoá.
- Nhấn vào nút `🗑️ Delete` (màu đỏ) để xoá hoàn toàn bot khỏi hệ thống.

---

## 4. Hướng dẫn Viết Script cho Bot (Webhook)

Khi người dùng nhắn tin cho bot của bạn, hệ thống ChatApps_Pigeons sẽ gửi một yêu cầu `POST` đến **Webhook URL** mà bạn đã cấu hình ở Bước 2. Script của bạn phải được dựng trên một server (hoặc Google Apps Script) có URL công khai.

### 4.1. Cấu trúc Dữ liệu Nhận được (Webhook Payload) - BẮT BUỘC
Server của bạn sẽ nhận được một HTTP POST request với body là JSON theo cấu trúc chính xác như sau:

```json
{
  "chat_id": "UUID (Mã cuộc trò chuyện)",
  "text": "Nội dung tin nhắn người dùng gửi",
  "from": {
    "id": "UUID (Mã người gửi)",
    "display_name": "Tên hiển thị của người gửi"
  }
}
```

> [!IMPORTANT]
> Script của bạn **phải** đọc trường `text` để biết người dùng nói gì và dùng `chat_id` nếu cần lưu trữ ngữ cảnh.

### 4.2. Cấu trúc Dữ liệu Phản hồi (Webhook Response) - BẮT BUỘC
Để bot trả lời lại người dùng, Script của bạn **phải** trả về HTTP Status Code `200 OK` kèm theo body là JSON có cấu trúc bắt buộc như sau:

```json
{
  "reply": "Nội dung tin nhắn mà bot muốn trả lời người dùng"
}
```

> [!WARNING]
> Nếu script không trả về đúng cấu trúc `{ "reply": "..." }`, hệ thống sẽ không thể hiển thị câu trả lời của bot lên giao diện.

---

## 5. Ví dụ Script mẫu (Google Apps Script)

Dưới đây là một script hoàn chỉnh viết bằng Google Apps Script (miễn phí và dễ dùng) tuân thủ đúng cấu trúc bắt buộc của hệ thống:

```javascript
function doPost(e) {
  try {
    // 1. Đọc dữ liệu JSON gửi từ hệ thống ChatApps_Pigeons
    var data = JSON.parse(e.postData.contents);
    var userText = data.text;
    var senderName = data.from.display_name;
    
    // 2. Logic xử lý của Bot (Ví dụ: Echo bot - lặp lại tin nhắn)
    var replyText = "Chào " + senderName + "! Bạn vừa nói: '" + userText + "'";
    
    // 3. Tạo object phản hồi theo đúng cấu trúc bắt buộc
    var responseData = {
      "reply": replyText
    };
    
    // 4. Trả về kết quả dưới dạng JSON
    return ContentService.createTextOutput(JSON.stringify(responseData))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (error) {
    // Xử lý lỗi nếu có
    var errorResponse = {
      "reply": "Xin lỗi, bot đang gặp sự cố kỹ thuật!"
    };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### Cách sử dụng script trên:
1. Truy cập [Google Apps Script](https://script.google.com/).
2. Tạo dự án mới và dán code trên vào.
3. Nhấn **Deploy** > **New deployment**.
4. Chọn type là **Web app**, set access là **Anyone**.
5. Copy URL nhận được và dùng `@botfather` lệnh `/mybots` để gắn vào mục **Webhook URL** của bot.
