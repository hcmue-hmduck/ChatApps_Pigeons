const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/sequelizeConfig');

const Participant = sequelize.define('Participant', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
    },
    conversation_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'conversation_id'
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id'
    },
    role: {
        type: DataTypes.STRING(20),
        defaultValue: 'member',
        field: 'role',
        validate: {
            isIn: [['member', 'admin', 'owner']]
        }
    },
    joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'joined_at',
        // get() {
        //     const rawValue = this.getDataValue('joined_at');
        //     if (!rawValue) return null;
        //     const d = new Date(rawValue);
        //     const pad = n => n.toString().padStart(2, '0');
        //     return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${d.getMilliseconds().toString().padStart(3, '0')}`;
        // }
    },
    left_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'left_at',
        // get() {
        //     const rawValue = this.getDataValue('left_at');
        //     if (!rawValue) return null;
        //     const d = new Date(rawValue);
        //     const pad = n => n.toString().padStart(2, '0');
        //     return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${d.getMilliseconds().toString().padStart(3, '0')}`;
        // }
    },
    nick_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'nick_name'
    },
    is_muted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_muted'
    },
    is_pinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_pinned'
    },
    last_read_message_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'last_read_message_id'
    }
}, {
    tableName: 'participants',
    timestamps: false,
    freezeTableName: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['conversation_id'] },
        { fields: ['last_read_message_id'] }
    ],
    uniqueKeys: {
        unique_participant: {
            fields: ['conversation_id', 'user_id']
        }
    }
});

module.exports = Participant;
