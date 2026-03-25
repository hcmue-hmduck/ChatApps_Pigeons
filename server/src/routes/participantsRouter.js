const express = require('express');
const router = express.Router();

const participantsController = require('../controllers/participantsController');

router.post('/:convID', participantsController.createParticipant);
router.put('/:id', participantsController.putParticipant);

module.exports = router;
