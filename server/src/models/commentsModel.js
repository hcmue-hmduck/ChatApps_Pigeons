const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/sequelizeConfig');

const Comment = sequelize.define('Comment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
    },
    post_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'post_id'
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id'
    },
    parent_comment_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'parent_comment_id'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'content'
    },
    media_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'media_url'
    },
    media_type: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: 'media_type',
        validate: {
            isIn: [['image', 'video', 'file']]
        }
    },
    likes_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'likes_count'
    },
    replies_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'replies_count'
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_deleted'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        field: 'created_at'
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
        field: 'updated_at'
    }
}, {
    tableName: 'comments',
    timestamps: false,
    freezeTableName: true,
    indexes: [
        { fields: ['post_id'] },
        { fields: ['user_id'] },
        { fields: ['parent_comment_id'] },
        { fields: ['created_at'] }
    ]
});

Comment.associate = (models) => {
    Comment.belongsTo(models.Post, {
        foreignKey: 'post_id',
        as: 'post'
    });
    Comment.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
    Comment.belongsTo(models.Comment, {
        foreignKey: 'parent_comment_id',
        as: 'parent_comment'
    });
    Comment.hasMany(models.Comment, {
        foreignKey: 'parent_comment_id',
        as: 'replies'
    });
    Comment.hasMany(models.CommentReaction, {
        foreignKey: 'comment_id',
        as: 'reactions'
    });
};

module.exports = Comment;