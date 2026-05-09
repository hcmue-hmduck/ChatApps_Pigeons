const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/sequelizeConfig');

const GroupJoinRequests = sequelize.define('GroupJoinRequests', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users', // Tên bảng users trong DB
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    conversation_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'conversations', // Tên bảng conversations trong DB
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'approved', 'rejected']]
        }
    },
    note: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    processed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    }
}, {
    tableName: 'group_join_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'conversation_id'],
            where: { status: 'pending' }
        },
        {
            name: 'idx_gjr_conv_status',
            fields: ['conversation_id', 'status']
        }
    ]
});

module.exports = GroupJoinRequests;
