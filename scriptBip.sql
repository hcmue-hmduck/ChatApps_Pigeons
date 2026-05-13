-- =====================================================
-- SCHEMA: ChatPigeons bản đẹp
-- =====================================================

CREATE SCHEMA IF NOT EXISTS "ChatPigeons2";

ALTER DATABASE pigeonsv2 SET search_path TO "ChatPigeons2", public;
SET search_path TO "ChatPigeons2", public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA "ChatPigeons2";
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA "ChatPigeons2";

-- =====================================================
-- Bảng users
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    last_online_at TIMESTAMPTZ,
    is_bot BOOLEAN DEFAULT FALSE,
    bot_name VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- E2EE fields (client key storage & backup)
    public_key TEXT,
    wrapped_private_key TEXT,
    kek_iv VARCHAR(64),
    pin_salt VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_bot_name ON users(bot_name) WHERE is_bot = TRUE;

-- =====================================================
-- Bảng bots
-- =====================================================
CREATE TABLE IF NOT EXISTS bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    webhook_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bots_bot_user_id ON bots(bot_user_id);
CREATE INDEX IF NOT EXISTS idx_bots_owner_id ON bots(owner_id);


-- =====================================================
-- Bảng conversations
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_type VARCHAR(20) NOT NULL DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group')),
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    last_message_id UUID,
    last_message_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    key_status VARCHAR(20) DEFAULT 'no_key' CHECK (key_status IN ('no_key', 'active', 'require_rotation')),
    -- allow_history_view BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(conversation_type);

-- =====================================================
-- Bảng participants
-- =====================================================
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMPTZ NULL,
    nick_name VARCHAR(100),
    is_muted BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    last_read_message_id UUID,
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_last_read ON participants(last_read_message_id);

-- =====================================================
-- Bảng calls
-- =====================================================
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    call_type VARCHAR(20) NOT NULL DEFAULT 'direct' CHECK (call_type IN ('direct', 'group')),
    media_type VARCHAR(20) NOT NULL DEFAULT 'video' CHECK (media_type IN ('video', 'audio')),
    started_at TIMESTAMPTZ NULL,
    ended_at TIMESTAMPTZ NULL,
    duration_seconds INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'completed', 'missed', 'declined', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calls_conversation ON calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_call_type ON calls(call_type);
CREATE INDEX IF NOT EXISTS idx_calls_media_type ON calls(media_type);

-- =====================================================
-- Bảng messages
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio', 'video', 'sticker', 'call', 'system')),
    content TEXT,
    file_url VARCHAR(500),
    file_size BIGINT,
    file_name VARCHAR(255),
    thumbnail_url VARCHAR(500),
    link_description VARCHAR(500),
    duration INTEGER,
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    has_link BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_for_all BOOLEAN DEFAULT FALSE,
    parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- For E2EE: if message is encrypted, `encrypted_content` holds ciphertext and `content` may be NULL (plaintext only stored locally)
    is_e2ee BOOLEAN DEFAULT FALSE,
    key_version INTEGER,
    iv VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_call ON messages(call_id);

-- =====================================================
-- Bảng conversationkeysvault (lưu shared_key đã được wrap cho từng user bằng public key của user đó)
-- =====================================================
CREATE TABLE IF NOT EXISTS conversationkeysvault (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    key_version INTEGER NOT NULL,
    wrapped_shared_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vault_conversation_id ON conversationkeysvault(conversation_id);
CREATE INDEX IF NOT EXISTS idx_vault_user_id ON conversationkeysvault(user_id);

-- =====================================================
-- Bảng pinnedmessages
-- =====================================================
CREATE TABLE IF NOT EXISTS pinnedmessages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    pinned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pinned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    note TEXT,
    order_index INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(message_id)
);

CREATE INDEX IF NOT EXISTS idx_pinned_messages_message ON pinnedmessages(message_id);

-- =====================================================
-- Bảng friendrequests
-- =====================================================
CREATE TABLE IF NOT EXISTS friendrequests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    note VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friendrequests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friendrequests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friendrequests(status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_both ON friendrequests(sender_id, receiver_id);

-- =====================================================
-- Bảng userblocks
-- =====================================================
CREATE TABLE IF NOT EXISTS userblocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON userblocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON userblocks(blocked_id);

-- =====================================================
-- Bảng friends
-- =====================================================
CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friendship_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    notes VARCHAR(500),
    UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_friendship_date ON friends(friendship_date DESC);
CREATE INDEX IF NOT EXISTS idx_friends_favorite ON friends(user_id, is_favorite);

-- =====================================================
-- Bảng emojis
-- =====================================================
CREATE TABLE IF NOT EXISTS emojis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unicode_char VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    shortcode VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50),
    keywords TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emojis_shortcode ON emojis(shortcode);
CREATE INDEX IF NOT EXISTS idx_emojis_category ON emojis(category);

-- =====================================================
-- Bảng message_reactions
-- =====================================================
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji_char VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, emoji_char)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_created_at ON message_reactions(created_at DESC);

-- -----------------------------------------------------
-- Bảng posts
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    post_type VARCHAR(20) DEFAULT 'text' CHECK (post_type IN ('text', 'media', 'link', 'share')),
    privacy VARCHAR(20) DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'only_me', 'custom')),
    feeling VARCHAR(50),
    location VARCHAR(255),
    shared_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_privacy ON posts(privacy);
CREATE INDEX IF NOT EXISTS idx_posts_shared_post ON posts(shared_post_id);

-- -----------------------------------------------------
-- Bảng postmedia
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS postmedia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video', 'file', 'link')),
    media_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    link_description VARCHAR(500),
    link_site_name VARCHAR(500),
    duration INT,
    file_size BIGINT,
    file_name VARCHAR(255),
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_postmedia_post_id ON postmedia(post_id);

-- -----------------------------------------------------
-- Bảng postreactions
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS postreactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji_char VARCHAR(10) NOT NULL,
    reaction_type VARCHAR(10) NOT NULL CHECK (reaction_type IN ('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_postreactions_post_id ON postreactions(post_id);
CREATE INDEX IF NOT EXISTS idx_postreactions_user_id ON postreactions(user_id);

-- -----------------------------------------------------
-- Bảng comments
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url VARCHAR(500),
    media_type VARCHAR(10) CHECK (media_type IN ('image', 'video', 'file')),
    likes_count INT DEFAULT 0,
    replies_count INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

