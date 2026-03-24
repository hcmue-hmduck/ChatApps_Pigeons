const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/sequelizeConfig');

const PostReaction = sequelize.define('PostReaction', {
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
    emoji_char: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'emoji_char'
    },
    reaction_type: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'reaction_type',
        validate: {
            isIn: [['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry']]
        }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        field: 'created_at'
    }
}, {
    tableName: 'postreactions',
    timestamps: false,
    freezeTableName: true,
    indexes: [
        { fields: ['post_id'] },
        { fields: ['user_id'] },
        { unique: true, fields: ['post_id', 'user_id'] }
    ]
});

PostReaction.associate = (models) => {
    PostReaction.belongsTo(models.Post, {
        foreignKey: 'post_id',
        as: 'post'
    });
    PostReaction.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
};

module.exports = PostReaction;