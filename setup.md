# HƯỚNG DẪN CÀI ĐẶT CƠ SỞ DỮ LIỆU (DATABASE SETUP)

Tài liệu này hướng dẫn chi tiết các bước thiết lập và cấu hình cơ sở dữ liệu PostgreSQL cho dự án ChatPigeons, phục vụ cho việc đưa vào báo cáo đồ án hoặc tài liệu kỹ thuật.

---

## 1. YÊU CẦU HỆ THỐNG
- **Hệ quản trị cơ sở dữ liệu**: PostgreSQL (Khuyến nghị phiên bản 14.0 trở lên).
- **Extension bắt buộc**: `uuid-ossp` (Dùng để tự động tạo mã UUID v4 cho các bảng).
- **Công cụ quản lý (Khuyên dùng)**: pgAdmin 4 hoặc DBeaver để thao tác trực quan.

---

## 2. CÁC BƯỚC CÀI ĐẶT CHI TIẾT

### Bước 1: Tạo Database mới
1. Mở công cụ quản lý database (ví dụ: pgAdmin).
2. Kết nối tới PostgreSQL Server của bạn.
3. Chuột phải vào mục **Databases** -> Chọn **Create** -> **Database...**
4. Nhập tên Database là: `chat_pigeons` (hoặc tên tùy chọn của bạn).
5. Bấm **Save** để tạo.

### Bước 2: Kích hoạt Extension UUID
Mở công cụ Query Tool tại database vừa tạo và chạy câu lệnh sau để kích hoạt tính năng sinh UUID:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Bước 3: Khởi tạo cấu trúc các bảng (Schema)
1. Mở file `server/ScriptDB_ChatPigeons.sql` trong thư mục dự án.
2. Sao chép toàn bộ nội dung file SQL này.
3. Dán vào công cụ **Query Tool** của database `chat_pigeons` trên pgAdmin.
4. Nhấn nút **Execute (F5)** để chạy. 
*(Hệ thống sẽ tự động tạo 17 bảng và các index tối ưu tìm kiếm).*

### Bước 4: Cấu hình biến môi trường trong Code
Để backend có thể kết nối được tới Database, bạn cần cấu hình file `.env` trong thư mục `server/`. Hãy mở file `.env` và cập nhật các thông số sau:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chat_pigeons
DB_USER=postgres
DB_PASSWORD=your_password_here
```
*(Thay thế `your_password_here` bằng mật khẩu tài khoản PostgreSQL của bạn).*

---

## 3. MÔ TẢ HỆ THỐNG CÁC BẢNG (DATA DICTIONARY)

Dưới đây là bảng tra cứu nhanh chức năng của toàn bộ **17 bảng** trong hệ thống cơ sở dữ liệu đã được tối ưu (đã loại bỏ các bảng thừa không sử dụng):

| STT | Tên Bảng | Chức năng chính |
| :--- | :--- | :--- |
| **1** | `users` | Lưu trữ thông tin tài khoản người dùng (Email, mật khẩu băm, avatar, khóa bảo mật E2EE...). |
| **2** | `bots` | Quản lý các tài khoản Bot tự động trong hệ thống và thông tin chủ sở hữu. |
| **3** | `conversations` | Lưu thông tin các cuộc hội thoại (bao gồm cả chat đôi và chat nhóm). |
| **4** | `participants` | Lưu danh sách thành viên tham gia vào từng cuộc hội thoại (Vai trò, biệt danh, trạng thái đọc...). |
| **5** | `calls` | Lưu lịch sử các cuộc gọi (Thời gian gọi, thời lượng, trạng thái, loại cuộc gọi...). |
| **6** | `messages` | Lưu trữ toàn bộ nội dung tin nhắn (Hỗ trợ tin nhắn văn bản, ảnh, file, call, system...). |
| **7** | `conversationkeysvault` | Lưu trữ các khóa đối xứng của cuộc trò chuyện đã được mã hóa bằng khóa công khai của từng user (Phục vụ E2EE). |
| **8** | `pinnedmessages` | Quản lý các tin nhắn được ghim trong từng cuộc hội thoại. |
| **9** | `friendrequests` | Lưu trữ các yêu cầu kết bạn giữa các người dùng và trạng thái xử lý. |
| **10** | `userblocks` | Lưu danh sách những người dùng bị chặn bởi người dùng khác. |
| **11** | `friends` | Lưu danh sách bạn bè đã kết nối thành công giữa các người dùng. |
| **12** | `emojis` | Thư viện lưu trữ các biểu tượng cảm xúc (Unicode, shortcode, image_url). |
| **13** | `message_reactions` | Lưu trữ các lượt thả cảm xúc (tim, haha, wow...) của người dùng đối với từng tin nhắn. |
| **14** | `posts` | Lưu trữ các bài viết trên trang bảng tin (Bảng tin cộng đồng). |
| **15** | `postmedia` | Lưu trữ các tệp đa phương tiện (ảnh, video, link) đính kèm trong các bài viết. |
| **16** | `postreactions` | Lưu trữ các lượt thả cảm xúc của người dùng đối với các bài viết. |
| **17** | `comments` | Lưu trữ các bình luận và phản hồi (reply) dưới các bài viết. |

---
*Tài liệu này được trích xuất dựa trên cấu trúc thực tế của file `ScriptDB_ChatPigeons.sql` đã tinh gọn.*
