const express = require('express');
const router = express.Router();
const usersRouter = require('./usersRouter');
const { authorize } = require('../middlewares/authMiddleware');

router.use(authorize(['admin']));

router.use('/users', usersRouter);

module.exports = router;