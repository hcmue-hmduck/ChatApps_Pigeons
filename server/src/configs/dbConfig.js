const { Pool } = require('pg');
const mongoose = require('mongoose');
require('dotenv').config();


// Debug: Log env variables if undefined
if (!process.env.DATABASE) {
    console.error('DATABASE is undefined!');
}
if (!process.env.UsernameDB) {
    console.error('UsernameDB is undefined!');
}
if (!process.env.PasswordDB) {
    console.error('PasswordDB is undefined!');
}
if (!process.env.SERVER_NAME) {
    console.error('SERVER_NAME is undefined!');
}
if (!process.env.MongoDB_URL) {
    console.error('MongoDB_URL is undefined!');
}

// PostgreSQL pool
const pgPool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function connectToDB() {
    let pgConnected = false;
    let mongoConnected = false;


    // Kết nối PostgreSQL
    try {
        await pgPool.query('SELECT 1');
        pgConnected = true;
    } catch (err) {
        console.error('PostgreSQL connection error:', err.message, '\nPOSTGRES_URL:', process.env.POSTGRES_URL);
    }

    // Kết nối MongoDB
    // try {
    //     await mongoose.connect(process.env.MongoDB_URL);
    //     mongoConnected = true;
    // } catch (err) {
    //     console.error('MongoDB connection error:', err.message, '\nMongoDB_URL:', process.env.MongoDB_URL);
    // }

    // Kiểm tra kết quả
    if (!pgConnected) {
        throw new Error('Failed to connect to PostgreSQL.');
    }
    // if (!mongoConnected) {
    //     throw new Error('Failed to connect to MongoDB.');
    // }

    console.log('All databases connected successfully.');
}


module.exports = {
    pgPool,
    connectToDB
};