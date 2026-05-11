const express = require('express');
const router = express.Router();
const usersRouter = require('./usersRouter');
const { authorize } = require('../middlewares/authMiddleware');

// router.use(authorize(['admin']));

const postsService = require('../services/postsService');
const messagesService = require('../services/messagesService');
const usersService = require('../services/usersService');

router.use('/users', usersRouter);

router.get('/stats', async (req, res) => {
    try {
        const [totalPosts, totalMessages, totalUsers, postsByDay, messagesByDay] = await Promise.all([
            postsService.countAllPosts(),
            messagesService.countAllMessages(),
            usersService.countAllUsers(),
            postsService.getPostsCountByDay(),
            messagesService.getMessagesCountByDay()
        ]);
        res.json({
            status: 'success',
            metadata: {
                totalPosts,
                totalMessages,
                totalUsers,
                postsByDay,
                messagesByDay
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;