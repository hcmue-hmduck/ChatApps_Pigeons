-- =====================================================
-- SCHEMA: ChatPigeons bản đẹp (Chuyển đổi cho SQL Server)
-- =====================================================

-- Tạo Database mới nếu chưa tồn tại
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ChatPigeonsDB')
BEGIN
    CREATE DATABASE [ChatPigeonsDB]
END
GO

-- Sử dụng Database vừa tạo
USE [ChatPigeonsDB]
GO

-- =====================================================
-- Bảng users
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[users] (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        email VARCHAR(100) UNIQUE,
        password_hash VARCHAR(250),
        full_name VARCHAR(250),
        bio VARCHAR(500),
        avatar_url VARCHAR(500),
        phone_number VARCHAR(20) UNIQUE,
        birthday DATE,
        gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', 'unspecified')),
        status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'busy')),
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        is_active BIT DEFAULT 1,
        is_email_verified BIT DEFAULT 0,
        is_phone_verified BIT DEFAULT 0,
        last_online_at DATETIME2,
        is_bot BIT DEFAULT 0,
        bot_name VARCHAR(255) UNIQUE,
        created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME2 DEFAULT CURRENT_TIMESTAMP,
        -- E2EE fields (client key storage & backup)
        public_key VARCHAR(MAX),
        wrapped_private_key VARCHAR(MAX),
        kek_iv VARCHAR(64),
        pin_salt VARCHAR(64)
    );
END
GO

-- Khởi tạo Indexes cho bảng users
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_email' AND object_id = OBJECT_ID('[dbo].[users]'))
    CREATE INDEX idx_users_email ON [dbo].[users](email);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_phone' AND object_id = OBJECT_ID('[dbo].[users]'))
    CREATE INDEX idx_users_phone ON [dbo].[users](phone_number);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_status' AND object_id = OBJECT_ID('[dbo].[users]'))
    CREATE INDEX idx_users_status ON [dbo].[users](status);
GO

-- =====================================================
-- Bảng conversations
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[conversations]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[conversations] (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        conversation_type VARCHAR(20) NOT NULL DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group')),
        name VARCHAR(255),
        avatar_url VARCHAR(500),
        last_message_id UNIQUEIDENTIFIER,
        last_message_at DATETIME2,
        is_active BIT DEFAULT 1,
        key_status VARCHAR(20) DEFAULT 'no_key' CHECK (key_status IN ('no_key', 'active', 'require_rotation')),
        created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME2 DEFAULT CURRENT_TIMESTAMP
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_conversations_last_message_at' AND object_id = OBJECT_ID('[dbo].[conversations]'))
    CREATE INDEX idx_conversations_last_message_at ON [dbo].[conversations](last_message_at);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_conversations_type' AND object_id = OBJECT_ID('[dbo].[conversations]'))
    CREATE INDEX idx_conversations_type ON [dbo].[conversations](conversation_type);
GO

-- =====================================================
-- Bảng participants
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[participants]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[participants] (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        conversation_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[conversations](id) ON DELETE CASCADE,
        user_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users](id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
        joined_at DATETIME2 DEFAULT CURRENT_TIMESTAMP,
        left_at DATETIME2 NULL,
        nick_name VARCHAR(100),
        is_muted BIT DEFAULT 0,
        is_pinned BIT DEFAULT 0,
        last_read_message_id UNIQUEIDENTIFIER,
        UNIQUE(conversation_id, user_id)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_participants_user_id' AND object_id = OBJECT_ID('[dbo].[participants]'))
    CREATE INDEX idx_participants_user_id ON [dbo].[participants](user_id);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_participants_conversation_id' AND object_id = OBJECT_ID('[dbo].[participants]'))
    CREATE INDEX idx_participants_conversation_id ON [dbo].[participants](conversation_id);
GO

-- =====================================================
-- Bảng calls
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[calls]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[calls] (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        conversation_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[conversations](id) ON DELETE CASCADE,
        call_type VARCHAR(20) NOT NULL DEFAULT 'direct' CHECK (call_type IN ('direct', 'group')),
        media_type VARCHAR(20) NOT NULL DEFAULT 'video' CHECK (media_type IN ('video', 'audio')),
        started_at DATETIME2 NULL,
        ended_at DATETIME2 NULL,
        duration_seconds INT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'completed', 'missed', 'declined', 'cancelled')),
        created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME2 DEFAULT CURRENT_TIMESTAMP
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_calls_conversation' AND object_id = OBJECT_ID('[dbo].[calls]'))
    CREATE INDEX idx_calls_conversation ON [dbo].[calls](conversation_id);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_calls_status' AND object_id = OBJECT_ID('[dbo].[calls]'))
    CREATE INDEX idx_calls_status ON [dbo].[calls](status);
GO

-- =====================================================
-- Bảng messages
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[messages]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[messages] (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        conversation_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[conversations](id) ON DELETE CASCADE,
        sender_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users](id) ON DELETE CASCADE,
        message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio', 'video', 'sticker', 'call', 'system')),
        content VARCHAR(MAX),
        file_url VARCHAR(500),
        file_size BIGINT,
        file_name VARCHAR(255),
        thumbnail_url VARCHAR(500),
        link_description VARCHAR(500),
        duration INT,
        call_id UNIQUEIDENTIFIER REFERENCES [dbo].[calls](id) ON DELETE NO ACTION,
        has_link BIT DEFAULT 0,
        is_edited BIT DEFAULT 0,
        is_deleted BIT DEFAULT 0,
        deleted_for_all BIT DEFAULT 0,
        parent_message_id UNIQUEIDENTIFIER REFERENCES [dbo].[messages](id) ON DELETE NO ACTION,
        created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME2 DEFAULT CURRENT_TIMESTAMP,
        is_e2ee BIT DEFAULT 0,
        key_version INT,
        iv VARCHAR(64)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_messages_conversation_created' AND object_id = OBJECT_ID('[dbo].[messages]'))
    CREATE INDEX idx_messages_conversation_created ON [dbo].[messages](conversation_id, created_at DESC);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_messages_sender' AND object_id = OBJECT_ID('[dbo].[messages]'))
    CREATE INDEX idx_messages_sender ON [dbo].[messages](sender_id);
GO

-- =====================================================
-- Bảng conversationkeysvault
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[conversationkeysvault]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[conversationkeysvault] (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users](id) ON DELETE CASCADE,
        conversation_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[conversations](id) ON DELETE CASCADE,
        key_version INT NOT NULL,
        wrapped_shared_key VARCHAR(MAX) NOT NULL,
        created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME2 DEFAULT CURRENT_TIMESTAMP
    );
END
GO

-- =====================================================
-- Bảng pinnedmessages
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pinnedmessages]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[pinnedmessages] (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        message_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[messages](id) ON DELETE CASCADE,
        pinned_by UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users](id) ON DELETE NO ACTION,
        pinned_at DATETIME2 DEFAULT CURRENT_TIMESTAMP NOT NULL,
        note VARCHAR(MAX),
        order_index INT DEFAULT 0,
        is_deleted BIT DEFAULT 0,
        UNIQUE(message_id)
    );
END
GO

-- =====================================================
-- Bảng friendrequests
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[friendrequests]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[friendrequests] (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        sender_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users](id) ON DELETE NO ACTION,
        receiver_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users](id) ON DELETE NO ACTION,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
        note VARCHAR(500),
        created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME2 DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(sender_id, receiver_id)
    );
END
GO

-- =====================================================
-- Bảng userblocks
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[userblocks]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[userblocks] (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        blocker_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users](id) ON DELETE NO ACTION,
        blocked_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users](id) ON DELETE NO ACTION,
        reason VARCHAR(500),
        created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE(blocker_id, blocked_id)
    );
END
GO

-- =====================================================
-- Bảng friends
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[friends]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[friends] (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users](id) ON DELETE NO ACTION,
        friend_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users](id) ON DELETE NO ACTION,
        friendship_date DATETIME2 DEFAULT CURRENT_TIMESTAMP NOT NULL,
        is_favorite BIT DEFAULT 0,
        notes VARCHAR(500),
        UNIQUE(user_id, friend_id)
    );
END
GO

-- =====================================================
-- Bảng message_reactions
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[message_reactions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[message_reactions] (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        message_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[messages](id) ON DELETE CASCADE,
        user_id UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users](id) ON DELETE NO ACTION,
        emoji_char VARCHAR(10) NOT NULL,
        created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, user_id, emoji_char)
    );
END
GO
