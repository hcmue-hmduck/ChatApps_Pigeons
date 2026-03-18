const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/sequelizeConfig');

/**
 * Model MessageReaction
 * Matches the SQL script for 'message_reactions' table
 */
const MessageReaction = sequelize.define('MessageReaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
    },
    message_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'message_id',
        references: {
            model: 'messages',
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    emoji_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'emoji_id',
        references: {
            model: 'emojis',
            key: 'id'
        }
    },
    emoji_char: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'emoji_char'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
        field: 'created_at'
    }
}, {
    tableName: 'message_reactions',
    schema: 'ChatPigeons',
    timestamps: false,
    freezeTableName: true,
    indexes: [
        {
            name: 'idx_message_reactions_message_id',
            fields: ['message_id']
        },
        {
            name: 'idx_message_reactions_user_id',
            fields: ['user_id']
        },
        {
            name: 'idx_message_reactions_emoji_id',
            fields: ['emoji_id']
        },
        {
            name: 'idx_message_reactions_created_at',
            fields: [{ attribute: 'created_at', order: 'DESC' }]
        }
    ]
});

// Associations
MessageReaction.associate = (models) => {
    MessageReaction.belongsTo(models.Message, {
        foreignKey: 'message_id',
        as: 'message'
    });
    MessageReaction.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
    MessageReaction.belongsTo(models.Emojis, {
        foreignKey: 'emoji_id',
        as: 'emoji'
    });
};

module.exports = MessageReaction;
