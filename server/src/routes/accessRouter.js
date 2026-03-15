const express = require('express');
const accessController = require('../controllers/accessController.js.js');
const { authentication, refreshAuthentication } = require('../middlewares/authMiddleware.js');
const router = express.Router();

router.post('/signup', accessController.signup);
router.post('/login', accessController.login);
router.post('/refresh-token', refreshAuthentication, accessController.refreshToken);
router.post('/logout', authentication, accessController.logout);

module.exports = router;
