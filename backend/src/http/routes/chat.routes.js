/**
 * Chat Routes
 */

const express = require('express');

const {
    getUserChats,
    createChat,
    getChatById,
    sendMessage,
    deleteChat,
    updateChatTitle,
} = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../validate');
const {
    chatIdValidation,
    createChatValidation,
    sendMessageValidation,
    updateChatTitleValidation,
} = require('../validators/chat.validator');

const router = express.Router();

router.use(protect);

router.get('/', getUserChats);
router.post('/', createChatValidation, validate, createChat);
router.get('/:chatId', chatIdValidation, validate, getChatById);
router.post('/:chatId/message', sendMessageValidation, validate, sendMessage);
router.delete('/:chatId', chatIdValidation, validate, deleteChat);
router.put('/:chatId/title', updateChatTitleValidation, validate, updateChatTitle);

module.exports = router;
