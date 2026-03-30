const { Sequelize } = require('sequelize');
require('dotenv').config();

// Cấu hình Sequelize cho SQL Server
const sequelize = new Sequelize(
    process.env.POSTGRES_URL,
    {
        dialect: 'postgres',
        timezone: 'Asia/Ho_Chi_Minh',
        logging: false,  // Bật log SQL queries để debug
        pool: {
            max: 20,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            },
        },
        define: {
            schema: 'ChatPigeons'  // Mặc định tất cả model sẽ dùng schema này
        }
    }
);

module.exports = { sequelize };
