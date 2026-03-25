const express = require('express');
const router = express.Router();

const postReactionsController = require('../controllers/post_reactionsController');

router.delete('/:id', postReactionsController.removePostReaction);
router.get('/:postID', postReactionsController.getPostReactions);
router.post('/', postReactionsController.addPostReaction);

module.exports = router;