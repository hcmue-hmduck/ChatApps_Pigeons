// Quick script to test getting messages from backend
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000, // wait I don't know the port. Check the terminal!
  path: '/api/home/messages/conv_123',
  method: 'GET'
};

