const { Sequelize } = require('sequelize');
require('dotenv').config();

// Cấu hình Sequelize cho SQL Server
const sequelize = new Sequelize(
    process.env.DATABASE,      // Database name
    process.env.UsernameDB,    // Username
    process.env.PasswordDB,    // Password
    {
        host: process.env.SERVER_NAME,
        dialect: 'postgres',
        logging: false,  // Bật log SQL queries để debug
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        define: {
            schema: 'ChatPigeons'  // Mặc định tất cả model sẽ dùng schema này
        }
    }
);

// Test connection
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Sequelize connected to SQL Server successfully.');
    } catch (error) {
        console.error('Sequelize connection error:', error.message);
    }
}


// Keep-alive: gửi truy vấn nhỏ định kỳ để giữ kết nối luôn sống
setInterval(() => {
    sequelize.query('SELECT 1');
}, 5 * 60 * 1000); // 5 phút

module.exports = { sequelize, testConnection };
