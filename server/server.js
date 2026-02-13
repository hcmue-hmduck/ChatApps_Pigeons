const express = require('express');
const https = require('https');
const dotenv = require('dotenv');
const cors = require('cors');
const { engine } = require('express-handlebars');
const path = require('path');
const Server = require('socket.io');
const fs = require('fs');
const morgan = require('morgan');

dotenv.config();

const routes = require('./src/routes/index');
const { connectToDB } = require('./src/configs/dbConfig');

const app = express();
const server = https.createServer(
    {
        key: fs.readFileSync(path.join(__dirname, '../cert/cert.key')),
        cert: fs.readFileSync(path.join(__dirname, '../cert/cert.crt')),
    },
    app,
);
const io = Server(server, {
    cors: {
        origin: [
            process.env.LINK_CLIENT,
            process.env.LINK_SERVER,
            process.env.LINK_CLIENT_PROD,
            process.env.LINK_SERVER_PROD,
            process.env.LINK_CLIENT_LOCAL_IP,
        ],
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
const PORT = process.env.PORT || 8888;

// CORS - Cho phép Angular gọi API
app.use(
    cors({
        origin: [
            process.env.LINK_CLIENT,
            process.env.LINK_SERVER,
            process.env.LINK_CLIENT_PROD,
            process.env.LINK_SERVER_PROD,
            process.env.LINK_CLIENT_LOCAL_IP,
        ],
        credentials: true,
    }),
);

app.use(morgan('dev'));
// Middleware parse JSON và URL-encoded data
app.use(express.json()); // Parse JSON body
app.use(express.urlencoded({ extended: true })); // Parse form data

// Cấu hình Handlebars view engine
app.engine(
    'handlebars',
    engine({
        defaultLayout: false,
    }),
);
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

    // Client 1 gửi offer cho Client 2
    socket.on('directCall:newOffer', (data) => {
        const { conversationId } = data;
        socket.to(conversationId).emit('directCall:offerAwaiting', data);
        console.log('Đã gửi offer cho client 2....', conversationId);
    });

    // Client 2 gửi answer về Client 1
    socket.on('directCall:newAnswer', (data) => {
        const { conversationId } = data;
        socket.to(conversationId).emit('directCall:answerResponse', data);
        console.log('Đã gửi answer cho client 1....', conversationId);
    });

    // Client gửi ICE candidate qua đối phương
    socket.on('directCall:newIceCandidate', (data) => {
        const { conversationId, iceCandidate } = data;
        // console.log('iceCandidate::', iceCandidate);
        socket.to(conversationId).emit('directCall:newIceCandidate', iceCandidate);
    });

    socket.on('call:endCall', (conversationId) => {
        socket.to(conversationId).emit('call:endCall');
    });

    socket.on('groupCall:inviteToJoinTheRoom', (data) => {
        socket.to(data.conversationId).emit('groupCall:joinRoom', data);
    });

    socket.on('call:cancelCall', (conversationId) => {
        socket.to(conversationId).emit('call:missedCall');
    });

    socket.on('call:declineCall', (conversationId) => {
        socket.to(conversationId).emit('call:declineCall')
    })
});

app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status_code = 404;
    next(error);
});

app.use((error, req, res, next) => {
    console.error(error.stack);
    res.status(req.status_code || 500).json({
        status: 'error',
        message: error.message || 'Internal Server Error',
    });
});

async function startServer() {
    await connectToDB();
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

startServer();
