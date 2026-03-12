const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/sequelizeConfig');

const PostTag = sequelize.define('PostTag', {
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
    x_coordinate: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'x_coordinate'
    },
    y_coordinate: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'y_coordinate'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        field: 'created_at'
    }
}, {
    tableName: 'posttags',
    timestamps: false,
    freezeTableName: true,
    indexes: [
        { fields: ['post_id'] },
        { fields: ['user_id'] },
        { unique: true, fields: ['post_id', 'user_id'] }
    ]
});

PostTag.associate = (models) => {
    PostTag.belongsTo(models.Post, {
        foreignKey: 'post_id',
        as: 'post'
    });
    PostTag.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
};

module.exports = PostTag;