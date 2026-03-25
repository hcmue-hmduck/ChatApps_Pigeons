const express = require('express');
const router = express.Router();

const homePostController = require('../controllers/homePostController');

router.get('/', homePostController.getHomePosts);
router.post('/', homePostController.createNewPost);
router.post('/:postID', homePostController.createNewMediaPost);
router.put('/:postID', homePostController.updatePost);
router.delete('/:postID', homePostController.deletePost);

module.exports = router;
