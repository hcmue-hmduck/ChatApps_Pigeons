const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/sequelizeConfig');

const PostMedia = sequelize.define('PostMedia', {
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
    media_type: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'media_type',
        validate: {
            isIn: [['image', 'video', 'file']]
        }
    },
    media_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: 'media_url'
    },
    thumbnail_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'thumbnail_url'
    },
    width: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'width'
    },
    height: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'height'
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'duration'
    },
    file_size: {
        type: DataTypes.BIGINT,
        allowNull: true,
        field: 'file_size'
    },
    file_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'file_name'
    },
    display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'display_order'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        field: 'created_at'
    }
}, {
    tableName: 'postmedia',
    timestamps: false,
    freezeTableName: true,
    indexes: [
        { fields: ['post_id'] }
    ]
});

PostMedia.associate = (models) => {
    PostMedia.belongsTo(models.Post, {
        foreignKey: 'post_id',
        as: 'post'
    });
};

module.exports = PostMedia;