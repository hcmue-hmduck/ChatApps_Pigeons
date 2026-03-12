const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/sequelizeConfig');

const SavedPost = sequelize.define('SavedPost', {
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
    post_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'post_id'
    },
    collection_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'default',
        field: 'collection_name'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        field: 'created_at'
    }
}, {
    tableName: 'savedposts',
    timestamps: false,
    freezeTableName: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['post_id'] },
        { unique: true, fields: ['user_id', 'post_id'] }
    ]
});

SavedPost.associate = (models) => {
    SavedPost.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
    SavedPost.belongsTo(models.Post, {
        foreignKey: 'post_id',
        as: 'post'
    });
};

module.exports = SavedPost;