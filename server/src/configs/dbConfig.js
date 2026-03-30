const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL pool
const pgPool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function connectToDB() {
    let pgConnected = false;

    // Kết nối PostgreSQL
    try {
        await pgPool.query('SELECT 1');
        pgConnected = true;
    } catch (err) {
        console.error('PostgreSQL connection error:', err.message, '\nPOSTGRES_URL:', process.env.POSTGRES_URL);
    }

    // Kiểm tra kết quả
    if (!pgConnected) {
        throw new Error('Failed to connect to PostgreSQL.');
    }
    console.log('Databases connected successfully.');
}


module.exports = {
    pgPool,
    connectToDB
};