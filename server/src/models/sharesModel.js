const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/sequelizeConfig');

const Share = sequelize.define('Share', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
    },
    original_post_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'original_post_id'
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
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        field: 'created_at'
    }
}, {
    tableName: 'shares',
    timestamps: false,
    freezeTableName: true,
    indexes: [
        { fields: ['original_post_id'] },
        { fields: ['user_id'] },
        { fields: ['created_at'] },
        { unique: true, fields: ['original_post_id', 'user_id'] }
    ]
});

Share.associate = (models) => {
    Share.belongsTo(models.Post, {
        foreignKey: 'original_post_id',
        as: 'original_post'
    });
    Share.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
};

module.exports = Share;