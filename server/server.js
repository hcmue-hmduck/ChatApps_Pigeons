const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const { createServer } = require('https');
const dotenv = require('dotenv');
const cors = require('cors');
const { engine } = require('express-handlebars');
const path = require('path');
const Server = require('socket.io');
const models = require('./src/models/index'); // Khởi tạo tất cả associations
const fs = require('fs');
const morgan = require('morgan');

const http = require('http');
const https = require('https');

dotenv.config();

const routes = require('./src/routes/index');
const { connectToDB } = require('./src/configs/dbConfig');

const app = express();

let server;

if (process.env.RENDER === 'true') {
    server = http.createServer(app);
} else {
    server = https.createServer(
        {
            key: fs.readFileSync(path.join(__dirname, '../cert/cert.key')),
            cert: fs.readFileSync(path.join(__dirname, '../cert/cert.crt')),
        },
        app,
    );
}

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

routes(app);

// Map để lưu trạng thái online của users (tối ưu cho multiple devices)
const onlineUsers = new Map(); // { userId: Set<socketId> }
const socketToUser = new Map(); // { socketId: userId } - O(1) lookup

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // User login - set online status
    socket.on('userOnline', async (userId) => {
        // Thêm socketId vào Set của userId
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);
        socketToUser.set(socket.id, userId);

        console.log(`User ${userId} is online (${onlineUsers.get(userId).size} connections)`);

        // Gửi danh sách tất cả users đang online cho user mới login
        const allOnlineUserIds = Array.from(onlineUsers.keys());
        socket.emit('onlineUsersList', allOnlineUserIds);

        // Chỉ emit nếu đây là connection đầu tiên (user mới online)
        if (onlineUsers.get(userId).size === 1) {
            // Cập nhật status thành online vào database
            try {
                await models.User.update({ status: 'online' }, { where: { id: userId } });
                console.log(`Updated status to online for user ${userId}`);
            } catch (error) {
                console.error(`Error updating status for user ${userId}:`, error);
            }

            io.emit('userStatusChanged', { userId, status: 'online' });
        }
    });

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

    // Cập nhật tin nhắn
    socket.on('updateMessage', (data) => {
        console.log('Received updateMessage event on server:', data);
        // Broadcast tới tất cả clients trong conversation (trừ người gửi)
        io.to(data.conversation_id).emit('updateMessage', data);
    });

    // Xóa tin nhắn
    socket.on('deleteMessage', (data) => {
        console.log('Received deleteMessage event on server:', data);
        // Broadcast tới tất cả clients trong conversation (trừ người gửi)
        socket.to(data.conversation_id).emit('deleteMessage', data);
    });

    // Ghim tin nhắn
    socket.on('pinMessage', (data) => {
        console.log('Received pinMessage event on server:', data);
        // Broadcast tới tất cả clients trong conversation (trừ người gửi)
        socket.to(data.conversation_id).emit('pinMessage', data);
    });

    socket.on('unpinMessage', (data) => {
        console.log('Received unpinMessage event on server:', data);
        // Broadcast tới tất cả clients trong conversation (trừ người gửi)
        socket.to(data.conversation_id).emit('unpinMessage', data);
    });

    socket.on('updateProfile', (data) => {
        console.log('Received updateProfile event on server:', data);
        io.emit('updateProfile', data);
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);

        const userId = socketToUser.get(socket.id);
        if (userId && onlineUsers.has(userId)) {
            onlineUsers.get(userId).delete(socket.id);
            socketToUser.delete(socket.id);

            console.log(`User ${userId} connection removed (${onlineUsers.get(userId).size} remaining)`);

            // Chỉ emit offline nếu không còn connection nào
            if (onlineUsers.get(userId).size === 0) {
                onlineUsers.delete(userId);

                // Cập nhật last_online_at vào database
                try {
                    await models.User.update(
                        {
                            status: 'offline',
                            last_online_at: new Date(),
                        },
                        { where: { id: userId } },
                    );
                    console.log(`Updated last_online_at for user ${userId}`);
                } catch (error) {
                    console.error(`Error updating last_online_at for user ${userId}:`, error);
                }

                io.emit('userStatusChanged', { userId, status: 'offline' });
            }
        }
    });

    // Client 1 gửi offer cho Client 2 (mời tham gia cuộc gọi 2 người)
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
        socket.to(conversationId).emit('directCall:newIceCandidate', iceCandidate);
    });

    // chuyển tiếp tín hiệu mời tham gia cuộc gọi nhóm
    socket.on('groupCall:inviteToJoinTheRoom', (data) => {
        socket.to(data.conversationId).emit('groupCall:joinRoom', data);
    });

    // chuyển tiếp tín hiệu cleanup call state
    socket.on('call:cleanUp', ({ conversationId, userId }) => {
        socket.to(conversationId).emit('call:cleanUp', userId);
    });

    // chuyển tiếp tín hiệu gác máy
    socket.on('call:hangUp', (conversationId) => {
        socket.to(conversationId).emit('call:hangUp');
    });

    // chuyển tiếp tín hiệu từ chối cuộc gọi
    socket.on('call:declined', (conversationId) => {
        socket.to(conversationId).emit('call:declined');
    });

    // chuyển tiếp tín hiệu cuộc gọi nhỡ
    socket.on('call:missed', (conversationId) => {
        socket.to(conversationId).emit('call:missed');
    });

    // đồng bộ call state giữa 2 instance
    socket.on('call:syncCallState', (data) => {
        socket.to(data.conversationId).emit('call:syncCallState', data);
    });
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
