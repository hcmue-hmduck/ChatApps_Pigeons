const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/sequelizeConfig');

// Định nghĩa model User với Sequelize
const User = sequelize.define('User', {
    // Primary Key
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
    },

    // Email
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'email',
        validate: {
            isEmail: true
        }
    },

    // Password Hash
    password_hash: {
        type: DataTypes.STRING(250),
        allowNull: false,
        field: 'password_hash'
    },

    // Full Name
    full_name: {
        type: DataTypes.STRING(250),
        allowNull: true,
        field: 'full_name'
    },

    // Bio
    bio: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'bio'
    },

    // Avatar URL
    avatar_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'avatar_url'
    },

    // Phone Number
    phone_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
        field: 'phone_number'
    },

    // Status
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'offline',
        field: 'status',
        validate: {
            isIn: [['online', 'offline', 'away', 'busy']]
        }
    },

    // Role
    role: {
        type: DataTypes.STRING(20),
        defaultValue: 'user',
        field: 'role',
        validate: {
            isIn: [['user', 'admin']]
        }
    },

    // Is Active
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },

    // Is Email Verified
    is_email_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_email_verified'
    },

    // Is Phone Verified
    is_phone_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_phone_verified'
    },

    // Last Online At
    last_online_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_online_at',
        // get() {
        //     const rawValue = this.getDataValue('last_online_at');
        //     if (!rawValue) return null;
        //     const d = new Date(rawValue);
        //     const pad = n => n.toString().padStart(2, '0');
        //     return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${d.getMilliseconds().toString().padStart(3, '0')}`;
        // }
    },

    // Created At
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        field: 'created_at',
        // get() {
        //     const rawValue = this.getDataValue('created_at');
        //     if (!rawValue) return null;
        //     const d = new Date(rawValue);
        //     const pad = n => n.toString().padStart(2, '0');
        //     return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${d.getMilliseconds().toString().padStart(3, '0')}`;
        // }
    },

    // Updated At
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
        field: 'updated_at',
        // get() {
        //     const rawValue = this.getDataValue('updated_at');
        //     if (!rawValue) return null;
        //     const d = new Date(rawValue);
        //     const pad = n => n.toString().padStart(2, '0');
        //     return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${d.getMilliseconds().toString().padStart(3, '0')}`;
        // }
    }
}, {
    // Cấu hình bảng
    tableName: 'users',
    schema: 'ChatPigeons',
    timestamps: false,
    freezeTableName: true,
    indexes: [
        { fields: ['email'] },
        { fields: ['phone_number'] },
        { fields: ['status'] }
    ]
});

// Instance methods
User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password_hash;  // Không trả về password
    return values;
};

// Class methods
User.findByEmail = async function (email) {
    return await this.findOne({ where: { email: email } });
};

User.findByPhone = async function (phoneNumber) {
    return await this.findOne({ where: { phone_number: phoneNumber } });
};

User.findActiveUsers = async function () {
    return await this.findAll({ where: { is_active: true } });
};

User.findOnlineUsers = async function () {
    return await this.findAll({ where: { status: 'online' } });
};


module.exports = User;
