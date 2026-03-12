const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/sequelizeConfig');

const CommentReaction = sequelize.define('CommentReaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
    },
    comment_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'comment_id'
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id'
    },
    reaction_type: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'reaction_type',
        validate: {
            isIn: [['like', 'love', 'haha', 'wow', 'sad', 'angry']]
        }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        field: 'created_at'
    }
}, {
    tableName: 'commentreactions',
    timestamps: false,
    freezeTableName: true,
    indexes: [
        { fields: ['comment_id'] },
        { fields: ['user_id'] },
        { unique: true, fields: ['comment_id', 'user_id'] }
    ]
});

CommentReaction.associate = (models) => {
    CommentReaction.belongsTo(models.Comment, {
        foreignKey: 'comment_id',
        as: 'comment'
    });
    CommentReaction.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
};

module.exports = CommentReaction;