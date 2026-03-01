// Import tất cả models
const Message = require('./messagesModel');
const Call = require('./callsModel');
const User = require('./usersModel');
const Conversation = require('./conversationsModel');
const Participant = require('./participantsModel');
const PinnedMessages = require('./pinnedmessagesModel');

// Tổng hợp tất cả models
const models = {
    Message,
    Call,
    User,
    Conversation,
    Participant,
    PinnedMessages
};

// Khởi tạo tất cả associations
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(models);
    }
});

module.exports = models;
