const express = require('express');
const { createServer } = require('http');
const dotenv = require('dotenv');
const cors = require('cors');
const { engine } = require('express-handlebars');
const path = require('path');
const Server = require('socket.io');

dotenv.config();

const routes = require('./src/routes/index');
const { connectToDB } = require('./src/configs/dbConfig');

const app = express();
const server = createServer(app);
const io = Server(server, {
    cors: {
        origin: [process.env.LINK_CLIENT, process.env.LINK_SERVER],
        methods: ['GET', 'POST'],
        credentials: true
    }
});
const PORT = process.env.PORT || 8888;

// CORS - Cho phép Angular gọi API
app.use(cors({  
  origin: [process.env.LINK_CLIENT, process.env.LINK_SERVER],
  credentials: true
}));

// Middleware parse JSON và URL-encoded data
app.use(express.json());                    // Parse JSON body
app.use(express.urlencoded({ extended: true })); // Parse form data

// Cấu hình Handlebars view engine
app.engine('handlebars', engine({
    defaultLayout: false
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'src/views'));

routes(app);

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // User join vào conversation room
    socket.on('joinConversation', (conversationId) => {
        socket.join(conversationId);
        console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    // Nhận tin nhắn từ client và broadcast cho người khác
    socket.on('sendMessage', (data) => {
        // Broadcast tin nhắn tới tất cả clients trong conversation (trừ người gửi)
        socket.to(data.conversation_id).emit('newMessage', data);
    });

    socket.on('updateConversation', (data) => {
        console.log('Received updateConversation event on server:', data);
        io.to(data.conversation_id).emit('updateConversation', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// app.use((req, res, next) => {
//     const error = new Error('Not Found');
//     error.status_code = 404;
//     next(error);
// });

// app.use((error, req, res, next) => {
//     console.error(error.stack);
//     res.status(req.status_code || 500).json({
//         status: 'error',
//         message: error.message || 'Internal Server Error',
//     });
// });

async function startServer() {
  await connectToDB();
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();