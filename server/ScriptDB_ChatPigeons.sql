-- =====================================================
-- SCHEMA: ChatPigeons
-- =====================================================

CREATE SCHEMA IF NOT EXISTS "ChatPigeons"
    AUTHORIZATION neondb_owner;

ALTER DATABASE neondb SET search_path TO "ChatPigeons", public;
SET search_path TO "ChatPigeons", public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA "ChatPigeons";

-- =====================================================
-- Bảng Users
-- =====================================================
CREATE TABLE Users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(250) NOT NULL,
    full_name VARCHAR(250),
    bio VARCHAR(500),
    avatar_url VARCHAR(500),
    phone_number VARCHAR(20) UNIQUE,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'busy')),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    last_online_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_phone ON Users(phone_number);
CREATE INDEX idx_users_status ON Users(status);

-- =====================================================
-- Bảng Conversations (Cuộc trò chuyện)
-- =====================================================
CREATE TABLE Conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_type VARCHAR(20) NOT NULL DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group')),
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    created_by UUID REFERENCES Users(id) ON DELETE SET NULL,
    last_message_id UUID,                -- Sẽ được cập nhật sau khi insert Messages
    last_message_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_last_message_at ON Conversations(last_message_at);
CREATE INDEX idx_conversations_type ON Conversations(conversation_type);

-- =====================================================
-- Bảng Participants (Thành viên trong cuộc trò chuyện)
-- =====================================================
CREATE TABLE Participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES Conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMPTZ NULL,
    nick_name VARCHAR(100),
    is_muted BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    last_read_message_id UUID,            -- Sẽ được tham chiếu sau
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_participants_user_id ON Participants(user_id);
CREATE INDEX idx_participants_conversation_id ON Participants(conversation_id);
CREATE INDEX idx_participants_last_read ON Participants(last_read_message_id);

-- =====================================================
-- Bảng Calls (Cuộc gọi) – Phải tạo trước Messages vì Messages tham chiếu Calls
-- =====================================================
CREATE TABLE Calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES Conversations(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    call_type VARCHAR(20) NOT NULL DEFAULT 'direct' CHECK (call_type IN ('direct', 'group')),
    media_type VARCHAR(20) NOT NULL DEFAULT 'video' CHECK (media_type IN ('video', 'audio')),
    started_at TIMESTAMPTZ NULL,
    ended_at TIMESTAMPTZ NULL,
    duration_seconds INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'completed', 'missed', 'declined', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calls_conversation ON Calls(conversation_id);
CREATE INDEX idx_calls_caller ON Calls(caller_id);
CREATE INDEX idx_calls_status ON Calls(status);
CREATE INDEX idx_calls_call_type ON Calls(call_type);
CREATE INDEX idx_calls_media_type ON Calls(media_type);

-- =====================================================
-- Bảng Messages (Tin nhắn)
-- =====================================================
CREATE TABLE Messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES Conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio', 'video', 'sticker', 'call', 'system')),
    content TEXT,
    file_url VARCHAR(500),
    file_size BIGINT,
    file_name VARCHAR(255),
    thumbnail_url VARCHAR(500),
    duration INTEGER,
    call_id UUID REFERENCES Calls(id) ON DELETE CASCADE,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_for_all BOOLEAN DEFAULT FALSE,
    parent_message_id UUID REFERENCES Messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation_created ON Messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON Messages(sender_id);
CREATE INDEX idx_messages_parent ON Messages(parent_message_id);
CREATE INDEX idx_messages_call ON Messages(call_id);

-- =====================================================
-- Bảng PinnedMessages (Tin nhắn ghim)
-- =====================================================
CREATE TABLE PinnedMessages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES Messages(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES Conversations(id) ON DELETE CASCADE,
    pinned_by UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    pinned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    note TEXT,
    order_index INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(message_id)
);

CREATE INDEX idx_pinned_messages_conversation ON PinnedMessages(conversation_id);
CREATE INDEX idx_pinned_messages_message ON PinnedMessages(message_id);

-- =====================================================
-- Bảng FriendRequests (Lời mời kết bạn)
-- =====================================================
CREATE TABLE FriendRequests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    note VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id)
);

CREATE INDEX idx_friend_requests_sender ON FriendRequests(sender_id);
CREATE INDEX idx_friend_requests_receiver ON FriendRequests(receiver_id);
CREATE INDEX idx_friend_requests_status ON FriendRequests(status);
CREATE INDEX idx_friend_requests_both ON FriendRequests(sender_id, receiver_id);

-- =====================================================
-- Bảng UserBlocks (Chặn người dùng)
-- =====================================================
CREATE TABLE UserBlocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    reason VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_user_blocks_blocker ON UserBlocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON UserBlocks(blocked_id);





-- =====================================================
-- DỮ LIỆU KIỂM THỬ CHO SCHEMA ChatPigeons
-- =====================================================

SET search_path TO "ChatPigeons", public;

-- -----------------------------------------------------
-- 1. Insert Users (5 người dùng)
-- -----------------------------------------------------
INSERT INTO Users (
    email, password_hash, full_name, bio, avatar_url, phone_number,
    status, role, is_active, last_online_at, created_at, updated_at
) VALUES 
(
    'admin@chatpigeons.com',
    'e10adc3949ba59abbe56e057f20f883e',
    'Admin User',
    'System Administrator',
    'https://i.pravatar.cc/150?img=1',
    '0901234567',
    'online',
    'admin',
    TRUE,
    CURRENT_TIMESTAMPTZ,
    CURRENT_TIMESTAMPTZ,
    CURRENT_TIMESTAMPTZ
),
(
    'john.wick@example.com',
    'e10adc3949ba59abbe56e057f20f883e',
    'John Wick',
    'Professional dog lover and action hero',
    'https://i.pravatar.cc/150?img=12',
    '0909876543',
    'away',
    'user',
    TRUE,
    CURRENT_TIMESTAMPTZ - INTERVAL '1 hour',
    CURRENT_TIMESTAMPTZ,
    CURRENT_TIMESTAMPTZ
),
(
    'sarah.connor@example.com',
    'e10adc3949ba59abbe56e057f20f883e',
    'Sarah Connor',
    'Future warrior, Skynet fighter',
    'https://i.pravatar.cc/150?img=5',
    '0912345678',
    'offline',
    'user',
    TRUE,
    CURRENT_TIMESTAMPTZ - INTERVAL '1 day',
    CURRENT_TIMESTAMPTZ,
    CURRENT_TIMESTAMPTZ
),
(
    'alice.johnson@example.com',
    'e10adc3949ba59abbe56e057f20f883e',
    'Alice Johnson',
    'Software Developer at TechCorp',
    'https://i.pravatar.cc/150?img=8',
    '0923456789',
    'online',
    'user',
    TRUE,
    CURRENT_TIMESTAMPTZ - INTERVAL '30 minutes',
    CURRENT_TIMESTAMPTZ,
    CURRENT_TIMESTAMPTZ
),
(
    'bob.miller@example.com',
    'e10adc3949ba59abbe56e057f20f883e',
    'Bob Miller',
    'Product Manager with 5+ years experience',
    'https://i.pravatar.cc/150?img=11',
    '0934567890',
    'busy',
    'user',
    TRUE,
    CURRENT_TIMESTAMPTZ - INTERVAL '2 hours',
    CURRENT_TIMESTAMPTZ,
    CURRENT_TIMESTAMPTZ
);

-- -----------------------------------------------------
-- 2. Insert Conversations
-- -----------------------------------------------------
WITH user_ids AS (
    SELECT 
        (SELECT id FROM Users WHERE email = 'john.wick@example.com') as john_id,
        (SELECT id FROM Users WHERE email = 'sarah.connor@example.com') as sarah_id,
        (SELECT id FROM Users WHERE email = 'admin@chatpigeons.com') as admin_id,
        (SELECT id FROM Users WHERE email = 'alice.johnson@example.com') as alice_id
)
INSERT INTO Conversations (conversation_type, name, avatar_url, created_by, last_message_at, is_active)
VALUES
    -- Direct chat John - Sarah
    ('direct', NULL, NULL, (SELECT john_id FROM user_ids), CURRENT_TIMESTAMPTZ - INTERVAL '30 minutes', TRUE),
    -- Group Pigeons Team
    ('group', 'Nhóm Pigeons Team', 'https://ui-avatars.com/api/?name=Pigeons+Team&background=4A90E2&color=fff',
     (SELECT admin_id FROM user_ids), CURRENT_TIMESTAMPTZ - INTERVAL '15 minutes', TRUE),
    -- Direct chat Alice - Bob
    ('direct', NULL, NULL, (SELECT alice_id FROM user_ids), CURRENT_TIMESTAMPTZ - INTERVAL '10 minutes', TRUE),
    -- Group Project Alpha
    ('group', 'Nhóm Project Alpha', 'https://ui-avatars.com/api/?name=Project+Alpha&background=FF6B6B&color=fff',
     (SELECT alice_id FROM user_ids), CURRENT_TIMESTAMPTZ - INTERVAL '5 minutes', TRUE);

-- -----------------------------------------------------
-- 3. Insert Participants
-- -----------------------------------------------------
WITH ids AS (
    SELECT
        c.id AS conv_id,
        c.conversation_type,
        u.id AS user_id,
        u.email
    FROM Conversations c
    CROSS JOIN Users u
)
INSERT INTO Participants (conversation_id, user_id, role, joined_at, nick_name)
SELECT
    c.id,
    u.id,
    CASE
        WHEN c.conversation_type = 'direct' THEN 'member'
        WHEN u.email = 'admin@chatpigeons.com' AND c.name = 'Nhóm Pigeons Team' THEN 'owner'
        WHEN u.email = 'alice.johnson@example.com' AND c.name = 'Nhóm Project Alpha' THEN 'owner'
        WHEN u.email = 'bob.miller@example.com' AND c.name = 'Nhóm Project Alpha' THEN 'admin'
        ELSE 'member'
    END,
    CURRENT_TIMESTAMPTZ - INTERVAL '1 day',
    split_part(u.email, '@', 1)
FROM Conversations c
JOIN Users u ON (
    (c.conversation_type = 'direct' AND (
        (c.name IS NULL AND u.email IN ('john.wick@example.com', 'sarah.connor@example.com') AND c.created_by = (SELECT id FROM Users WHERE email = 'john.wick@example.com')) OR
        (c.name IS NULL AND u.email IN ('alice.johnson@example.com', 'bob.miller@example.com') AND c.created_by = (SELECT id FROM Users WHERE email = 'alice.johnson@example.com'))
    )) OR
    (c.conversation_type = 'group' AND (
        (c.name = 'Nhóm Pigeons Team' AND u.email IN ('admin@chatpigeons.com', 'john.wick@example.com', 'sarah.connor@example.com')) OR
        (c.name = 'Nhóm Project Alpha' AND u.email IN ('alice.johnson@example.com', 'bob.miller@example.com', 'john.wick@example.com', 'sarah.connor@example.com'))
    ))
);

-- -----------------------------------------------------
-- 4. Insert Messages
-- -----------------------------------------------------
-- Lưu ý: Bỏ qua call messages vì chưa có dữ liệu Calls
WITH msg_data AS (
    SELECT
        c.id AS conv_id,
        c.conversation_type,
        c.name,
        u.id AS user_id,
        u.email
    FROM Conversations c
    JOIN Users u ON true
)
INSERT INTO Messages (conversation_id, sender_id, message_type, content, created_at)
SELECT * FROM (VALUES
    -- Direct John - Sarah
    ((SELECT id FROM Conversations WHERE conversation_type='direct' AND created_by = (SELECT id FROM Users WHERE email='john.wick@example.com') LIMIT 1),
     (SELECT id FROM Users WHERE email='john.wick@example.com'), 'text', 'Chào Sarah, bạn có kế hoạch gì cho cuối tuần này không?', CURRENT_TIMESTAMPTZ - INTERVAL '2 hours'),
    ((SELECT id FROM Conversations WHERE conversation_type='direct' AND created_by = (SELECT id FROM Users WHERE email='john.wick@example.com') LIMIT 1),
     (SELECT id FROM Users WHERE email='sarah.connor@example.com'), 'text', 'Chào John! Tôi định đi xem phim. Bạn có muốn đi cùng không?', CURRENT_TIMESTAMPTZ - INTERVAL '1 hour 45 minutes'),
    ((SELECT id FROM Conversations WHERE conversation_type='direct' AND created_by = (SELECT id FROM Users WHERE email='john.wick@example.com') LIMIT 1),
     (SELECT id FROM Users WHERE email='john.wick@example.com'), 'text', 'Nghe hay đấy! Phim gì vậy?', CURRENT_TIMESTAMPTZ - INTERVAL '1 hour 30 minutes'),
    ((SELECT id FROM Conversations WHERE conversation_type='direct' AND created_by = (SELECT id FROM Users WHERE email='john.wick@example.com') LIMIT 1),
     (SELECT id FROM Users WHERE email='sarah.connor@example.com'), 'image', 'Đây là poster phim', CURRENT_TIMESTAMPTZ - INTERVAL '1 hour 15 minutes'),
    ((SELECT id FROM Conversations WHERE conversation_type='direct' AND created_by = (SELECT id FROM Users WHERE email='john.wick@example.com') LIMIT 1),
     (SELECT id FROM Users WHERE email='sarah.connor@example.com'), 'text', 'Chúng ta có thể gặp nhau lúc 7h tối thứ Bảy.', CURRENT_TIMESTAMPTZ - INTERVAL '30 minutes'),

    -- Group Pigeons Team
    ((SELECT id FROM Conversations WHERE name='Nhóm Pigeons Team'),
     (SELECT id FROM Users WHERE email='admin@chatpigeons.com'), 'text', 'Chào mừng mọi người đến với nhóm ChatPigeons!', CURRENT_TIMESTAMPTZ - INTERVAL '3 hours'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Pigeons Team'),
     (SELECT id FROM Users WHERE email='john.wick@example.com'), 'text', 'Cảm ơn Admin! Rất vui được tham gia nhóm.', CURRENT_TIMESTAMPTZ - INTERVAL '2 hours 45 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Pigeons Team'),
     (SELECT id FROM Users WHERE email='sarah.connor@example.com'), 'text', 'Nhóm này dùng để làm gì vậy mọi người?', CURRENT_TIMESTAMPTZ - INTERVAL '2 hours 30 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Pigeons Team'),
     (SELECT id FROM Users WHERE email='admin@chatpigeons.com'), 'text', 'Đây là nhóm để thảo luận về dự án chat mới của chúng ta.', CURRENT_TIMESTAMPTZ - INTERVAL '2 hours'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Pigeons Team'),
     (SELECT id FROM Users WHERE email='admin@chatpigeons.com'), 'file', 'Đây là tài liệu dự án', CURRENT_TIMESTAMPTZ - INTERVAL '1 hour 30 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Pigeons Team'),
     (SELECT id FROM Users WHERE email='john.wick@example.com'), 'sticker', '👍', CURRENT_TIMESTAMPTZ - INTERVAL '1 hour'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Pigeons Team'),
     (SELECT id FROM Users WHERE email='sarah.connor@example.com'), 'text', 'Tôi đã đọc tài liệu. Có vẻ rất thú vị!', CURRENT_TIMESTAMPTZ - INTERVAL '15 minutes'),

    -- Direct Alice - Bob
    ((SELECT id FROM Conversations WHERE conversation_type='direct' AND created_by = (SELECT id FROM Users WHERE email='alice.johnson@example.com') LIMIT 1),
     (SELECT id FROM Users WHERE email='alice.johnson@example.com'), 'text', 'Chào Bob, bạn đã xem xong tài liệu dự án chưa?', CURRENT_TIMESTAMPTZ - INTERVAL '45 minutes'),
    ((SELECT id FROM Conversations WHERE conversation_type='direct' AND created_by = (SELECT id FROM Users WHERE email='alice.johnson@example.com') LIMIT 1),
     (SELECT id FROM Users WHERE email='bob.miller@example.com'), 'text', 'Chào Alice, tôi vừa xem xong. Có một số điểm cần thảo luận thêm.', CURRENT_TIMESTAMPTZ - INTERVAL '40 minutes'),
    ((SELECT id FROM Conversations WHERE conversation_type='direct' AND created_by = (SELECT id FROM Users WHERE email='alice.johnson@example.com') LIMIT 1),
     (SELECT id FROM Users WHERE email='alice.johnson@example.com'), 'text', 'Tốt quá! Chúng ta có thể họp vào 3h chiều nay được không?', CURRENT_TIMESTAMPTZ - INTERVAL '35 minutes'),
    ((SELECT id FROM Conversations WHERE conversation_type='direct' AND created_by = (SELECT id FROM Users WHERE email='alice.johnson@example.com') LIMIT 1),
     (SELECT id FROM Users WHERE email='bob.miller@example.com'), 'text', 'Được thôi, tôi sẽ sắp xếp. Tôi sẽ gửi bạn agenda qua email trước.', CURRENT_TIMESTAMPTZ - INTERVAL '30 minutes'),
    ((SELECT id FROM Conversations WHERE conversation_type='direct' AND created_by = (SELECT id FROM Users WHERE email='alice.johnson@example.com') LIMIT 1),
     (SELECT id FROM Users WHERE email='bob.miller@example.com'), 'file', 'Đây là agenda cho buổi họp', CURRENT_TIMESTAMPTZ - INTERVAL '25 minutes'),
    ((SELECT id FROM Conversations WHERE conversation_type='direct' AND created_by = (SELECT id FROM Users WHERE email='alice.johnson@example.com') LIMIT 1),
     (SELECT id FROM Users WHERE email='alice.johnson@example.com'), 'text', 'Cảm ơn Bob! Tôi đã nhận được. Hẹn gặp bạn lúc 3h.', CURRENT_TIMESTAMPTZ - INTERVAL '10 minutes'),

    -- Group Project Alpha
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='alice.johnson@example.com'), 'text', 'Chào mọi người! Đây là nhóm thảo luận cho Project Alpha.', CURRENT_TIMESTAMPTZ - INTERVAL '2 hours'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='bob.miller@example.com'), 'text', 'Rất vui được làm việc cùng tất cả mọi người!', CURRENT_TIMESTAMPTZ - INTERVAL '1 hour 55 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='john.wick@example.com'), 'text', 'Chào Alice và Bob! Sarah và tôi rất mong được hợp tác.', CURRENT_TIMESTAMPTZ - INTERVAL '1 hour 50 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='sarah.connor@example.com'), 'text', 'Tôi đã xem qua requirements. Chúng ta nên bắt đầu từ module authentication trước.', CURRENT_TIMESTAMPTZ - INTERVAL '1 hour 40 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='alice.johnson@example.com'), 'text', 'Đồng ý với Sarah. Bob, bạn có thể phụ trách phần database design không?', CURRENT_TIMESTAMPTZ - INTERVAL '1 hour 30 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='bob.miller@example.com'), 'text', 'Được, tôi sẽ làm phần database. John và Sarah có thể phụ trách frontend và backend không?', CURRENT_TIMESTAMPTZ - INTERVAL '1 hour 20 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='john.wick@example.com'), 'text', 'Tôi sẽ làm frontend. Sarah, bạn làm backend nhé?', CURRENT_TIMESTAMPTZ - INTERVAL '1 hour 15 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='sarah.connor@example.com'), 'text', 'OK, tôi đồng ý. Alice sẽ là project manager và review code cho cả nhóm.', CURRENT_TIMESTAMPTZ - INTERVAL '1 hour 10 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='alice.johnson@example.com'), 'file', 'Đây là timeline chi tiết cho dự án', CURRENT_TIMESTAMPTZ - INTERVAL '45 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='bob.miller@example.com'), 'sticker', '🚀', CURRENT_TIMESTAMPTZ - INTERVAL '30 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='john.wick@example.com'), 'text', 'Timeline hợp lý đấy. Chúng ta bắt đầu từ ngày mai nhé!', CURRENT_TIMESTAMPTZ - INTERVAL '20 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='sarah.connor@example.com'), 'text', 'Tôi đã sẵn sàng. Hẹn gặp mọi người trong buổi meeting đầu tiên!', CURRENT_TIMESTAMPTZ - INTERVAL '5 minutes'),

    -- System messages for groups
    ((SELECT id FROM Conversations WHERE name='Nhóm Pigeons Team'),
     (SELECT id FROM Users WHERE email='admin@chatpigeons.com'), 'system', 'Sarah Connor đã tham gia nhóm.', CURRENT_TIMESTAMPTZ - INTERVAL '1 day 2 hours'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Pigeons Team'),
     (SELECT id FROM Users WHERE email='admin@chatpigeons.com'), 'system', 'John Wick đã tham gia nhóm.', CURRENT_TIMESTAMPTZ - INTERVAL '1 day 1 hour'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='alice.johnson@example.com'), 'system', 'Bob Miller đã tham gia nhóm.', CURRENT_TIMESTAMPTZ - INTERVAL '1 day 3 hours'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='alice.johnson@example.com'), 'system', 'John Wick đã tham gia nhóm.', CURRENT_TIMESTAMPTZ - INTERVAL '1 day 2 hours 55 minutes'),
    ((SELECT id FROM Conversations WHERE name='Nhóm Project Alpha'),
     (SELECT id FROM Users WHERE email='alice.johnson@example.com'), 'system', 'Sarah Connor đã tham gia nhóm.', CURRENT_TIMESTAMPTZ - INTERVAL '1 day 2 hours 50 minutes')
) AS t(conv_id, sender_id, message_type, content, created_at);

-- -----------------------------------------------------
-- 5. Cập nhật last_message_id cho Conversations
-- -----------------------------------------------------
UPDATE Conversations c
SET last_message_id = latest_msg.id
FROM (
    SELECT DISTINCT ON (conversation_id) conversation_id, id
    FROM Messages
    WHERE is_deleted = FALSE
    ORDER BY conversation_id, created_at DESC
) latest_msg
WHERE c.id = latest_msg.conversation_id;

-- -----------------------------------------------------
-- 6. Insert PinnedMessages
-- -----------------------------------------------------
WITH ids AS (
    SELECT
        (SELECT id FROM Conversations WHERE name = 'Nhóm Pigeons Team' LIMIT 1) AS conv_pigeons,
        (SELECT id FROM Messages WHERE content = 'Chào mừng mọi người đến với nhóm ChatPigeons!' LIMIT 1) AS msg_pigeons_welcome,
        (SELECT id FROM Conversations WHERE name = 'Nhóm Project Alpha' LIMIT 1) AS conv_alpha,
        (SELECT id FROM Messages WHERE content = 'Đây là timeline chi tiết cho dự án' LIMIT 1) AS msg_alpha_timeline,
        (SELECT c.id FROM Conversations c
         JOIN Participants p1 ON p1.conversation_id = c.id
         JOIN Participants p2 ON p2.conversation_id = c.id
         WHERE c.conversation_type = 'direct'
           AND p1.user_id = (SELECT id FROM Users WHERE email = 'john.wick@example.com')
           AND p2.user_id = (SELECT id FROM Users WHERE email = 'sarah.connor@example.com')
         LIMIT 1) AS conv_direct_john_sarah,
        (SELECT id FROM Messages WHERE content = 'Đây là poster phim' LIMIT 1) AS msg_direct_poster,
        (SELECT id FROM Users WHERE email = 'admin@chatpigeons.com') AS admin_id,
        (SELECT id FROM Users WHERE email = 'alice.johnson@example.com') AS alice_id,
        (SELECT id FROM Users WHERE email = 'john.wick@example.com') AS john_id
)
INSERT INTO PinnedMessages (message_id, conversation_id, pinned_by, pinned_at, note, order_index, is_deleted)
VALUES
    ((SELECT msg_pigeons_welcome FROM ids), (SELECT conv_pigeons FROM ids), (SELECT admin_id FROM ids),
     CURRENT_TIMESTAMPTZ - INTERVAL '2 days', 'Tin nhắn chào mừng chính thức của nhóm', 1, FALSE),
    ((SELECT msg_alpha_timeline FROM ids), (SELECT conv_alpha FROM ids), (SELECT alice_id FROM ids),
     CURRENT_TIMESTAMPTZ - INTERVAL '1 day', 'Lộ trình dự án – cần theo dõi', 2, FALSE),
    ((SELECT msg_direct_poster FROM ids), (SELECT conv_direct_john_sarah FROM ids), (SELECT john_id FROM ids),
     CURRENT_TIMESTAMPTZ - INTERVAL '12 hours', 'Poster phim cuối tuần này', 1, FALSE);

-- -----------------------------------------------------
-- 7. Insert FriendRequests
-- -----------------------------------------------------
WITH user_ids AS (
    SELECT
        (SELECT id FROM Users WHERE email = 'john.wick@example.com') AS john_id,
        (SELECT id FROM Users WHERE email = 'sarah.connor@example.com') AS sarah_id,
        (SELECT id FROM Users WHERE email = 'admin@chatpigeons.com') AS admin_id,
        (SELECT id FROM Users WHERE email = 'alice.johnson@example.com') AS alice_id,
        (SELECT id FROM Users WHERE email = 'bob.miller@example.com') AS bob_id
)
INSERT INTO FriendRequests (sender_id, receiver_id, status, note, created_at, updated_at)
VALUES
    ((SELECT john_id FROM user_ids), (SELECT sarah_id FROM user_ids), 'accepted',
     'Chào Sarah, mình là John. Kết bạn nhé!',
     CURRENT_TIMESTAMPTZ - INTERVAL '3 days', CURRENT_TIMESTAMPTZ - INTERVAL '3 days'),
    ((SELECT admin_id FROM user_ids), (SELECT alice_id FROM user_ids), 'pending',
     'Chào Alice, rất vui được làm việc cùng bạn!',
     CURRENT_TIMESTAMPTZ - INTERVAL '1 day', CURRENT_TIMESTAMPTZ - INTERVAL '1 day'),
    ((SELECT alice_id FROM user_ids), (SELECT bob_id FROM user_ids), 'accepted',
     'Bob, kết bạn để trao đổi công việc nhé!',
     CURRENT_TIMESTAMPTZ - INTERVAL '5 days', CURRENT_TIMESTAMPTZ - INTERVAL '4 days'),
    ((SELECT bob_id FROM user_ids), (SELECT john_id FROM user_ids), 'rejected',
     'Hi John, mình là Bob từ team Alpha.',
     CURRENT_TIMESTAMPTZ - INTERVAL '2 days', CURRENT_TIMESTAMPTZ - INTERVAL '1 day');

-- -----------------------------------------------------
-- 8. Insert UserBlocks
-- -----------------------------------------------------
WITH user_ids AS (
    SELECT
        (SELECT id FROM Users WHERE email = 'sarah.connor@example.com') AS sarah_id,
        (SELECT id FROM Users WHERE email = 'john.wick@example.com') AS john_id,
        (SELECT id FROM Users WHERE email = 'bob.miller@example.com') AS bob_id
)
INSERT INTO UserBlocks (blocker_id, blocked_id, reason, created_at)
VALUES
    ((SELECT sarah_id FROM user_ids), (SELECT john_id FROM user_ids),
     'Spam tin nhắn không liên quan', CURRENT_TIMESTAMPTZ - INTERVAL '6 hours'),
    ((SELECT bob_id FROM user_ids), (SELECT sarah_id FROM user_ids),
     'Người dùng gửi yêu cầu kết bạn làm phiền', CURRENT_TIMESTAMPTZ - INTERVAL '2 days');

-- -----------------------------------------------------
-- 9. Kiểm tra nhanh (tuỳ chọn)
-- -----------------------------------------------------
SELECT 'Users' AS table_name, COUNT(*) FROM Users
UNION ALL
SELECT 'Conversations', COUNT(*) FROM Conversations
UNION ALL
SELECT 'Participants', COUNT(*) FROM Participants
UNION ALL
SELECT 'Messages', COUNT(*) FROM Messages
UNION ALL
SELECT 'PinnedMessages', COUNT(*) FROM PinnedMessages
UNION ALL
SELECT 'FriendRequests', COUNT(*) FROM FriendRequests
UNION ALL
SELECT 'UserBlocks', COUNT(*) FROM UserBlocks;




select * from messages where message_type='call'
select * from calls where conversation_id='1d43ee21-dac4-4011-bd49-960455130396'

-- Bước 1: Đặt múi giờ phiên thành UTC+7 (Indochina Time)
SET timezone = 'Asia/Bangkok';

-- Bước 2: Chạy vòng lặp để thay đổi kiểu dữ liệu cho tất cả cột timestamp trong schema ChatPigeons
DO $$
DECLARE
    r RECORD;
    alter_cmd TEXT;
BEGIN
    FOR r IN (
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'ChatPigeons'
          AND data_type = 'timestamp without time zone'
    ) LOOP
        alter_cmd := format(
            'ALTER TABLE %I.%I ALTER COLUMN %I TYPE timestamptz;',
            r.table_schema, r.table_name, r.column_name
        );
        RAISE NOTICE 'Executing: %', alter_cmd;
        EXECUTE alter_cmd;
    END LOOP;
END $$;
