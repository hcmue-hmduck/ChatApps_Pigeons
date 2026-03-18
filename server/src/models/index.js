// Import tất cả models
const Message = require('./messagesModel');
const Call = require('./callsModel');
const User = require('./usersModel');
const Conversation = require('./conversationsModel');
const Participant = require('./participantsModel');
const PinnedMessages = require('./pinnedmessagesModel');
const Friends = require('./friendsModel');
const FriendRequest = require('./friendrequestsModel');
const UserBlock = require('./userblockModel');
const Post = require('./postsModel');
const PostMedia = require('./postmediaModel');
const PostReaction = require('./postreactionsModel');
const Comment = require('./commentsModel');
const CommentReaction = require('./commentreactionsModel');
const Share = require('./sharesModel');
const PostTag = require('./posttagsModel');
const SavedPost = require('./savedpostsModel');
const Emojis = require('./emojisModel');
const MessageReaction = require('./messagereactionsModel');

// Tổng hợp tất cả models
const models = {
    Message,
    Call,
    User,
    Conversation,
    Participant,
    PinnedMessages,
    Friends,
    FriendRequest,
    UserBlock,
    Post,
    PostMedia,
    PostReaction,
    Comment,
    CommentReaction,
    Share,
    PostTag,
    SavedPost,
    Emojis,
    MessageReaction
};

// Khởi tạo tất cả associations
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(models);
    }
});

module.exports = models;
