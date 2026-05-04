const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/sequelizeConfig');
const User = require('./usersModel');

// Định nghĩa model Bot với Sequelize
const Bot = sequelize.define('Bot', {
    // Primary Key
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
    },
    
    // Khóa ngoại trỏ về User account của Bot
    bot_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'bot_user_id',
        references: {
            model: User,
            key: 'id'
        }
    },
    
    // Khóa ngoại trỏ về người tạo ra Bot
    owner_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'owner_id',
        references: {
            model: User,
            key: 'id'
        }
    },
    
    // Token đã được hash
    token_hash: {
        type: DataTypes.STRING(250),
        allowNull: false,
        field: 'token_hash'
    },
    
    // Webhook URL của Bot Server
    webhook_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'webhook_url',
        validate: {
            isUrl: true
        }
    },
    
    // Trạng thái của bot
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'active',
        field: 'status',
        validate: {
            isIn: [['active', 'disabled']]
        }
    },
    
    // Created At
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        field: 'created_at'
    },
    
    // Updated At
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
        field: 'updated_at'
    }
}, {
    // Cấu hình bảng
    tableName: 'bots',
    schema: 'ChatPigeons',
    timestamps: false,
    freezeTableName: true,
    indexes: [
        { fields: ['owner_id'] },
        { fields: ['bot_user_id'] }
    ]
});

// Định nghĩa associations nếu cần (tuỳ thuộc vào thiết kế hệ thống)
// Lưu ý: Có thể định nghĩa ở file index.js của models để tránh vòng lặp dependencies
// Bot.belongsTo(User, { as: 'BotAccount', foreignKey: 'bot_user_id' });
// Bot.belongsTo(User, { as: 'Owner', foreignKey: 'owner_id' });

module.exports = Bot;
