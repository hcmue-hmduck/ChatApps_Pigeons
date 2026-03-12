const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/sequelizeConfig');

const Post = sequelize.define('Post', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'content'
    },
    post_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'text',
        field: 'post_type',
        validate: {
            isIn: [['text', 'image', 'video', 'link', 'poll', 'share']]
        }
    },
    privacy: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'public',
        field: 'privacy',
        validate: {
            isIn: [['public', 'friends', 'only_me', 'custom']]
        }
    },
    feeling: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'feeling'
    },
    location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'location'
    },
    shared_post_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'shared_post_id'
    },
    likes_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'likes_count'
    },
    comments_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'comments_count'
    },
    shares_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'shares_count'
    },
    is_pinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_pinned'
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
    tableName: 'posts',
    timestamps: false,
    freezeTableName: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['created_at'] },
        { fields: ['privacy'] },
        { fields: ['shared_post_id'] }
    ]
});

Post.associate = (models) => {
    Post.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'author'
    });
    Post.belongsTo(models.Post, {
        foreignKey: 'shared_post_id',
        as: 'shared_post'
    });
    Post.hasMany(models.PostMedia, {
        foreignKey: 'post_id',
        as: 'media'
    });
    Post.hasMany(models.PostReaction, {
        foreignKey: 'post_id',
        as: 'reactions'
    });
    Post.hasMany(models.Comment, {
        foreignKey: 'post_id',
        as: 'comments'
    });
    Post.hasMany(models.Share, {
        foreignKey: 'original_post_id',
        as: 'shares'
    });
    Post.hasMany(models.PostTag, {
        foreignKey: 'post_id',
        as: 'tags'
    });
    Post.hasMany(models.SavedPost, {
        foreignKey: 'post_id',
        as: 'saved_by'
    });
};

module.exports = Post;