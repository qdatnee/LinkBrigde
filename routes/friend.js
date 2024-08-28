const express = require('express');
const router = express.Router();
const {
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    removeFriend,
    deleteReceivedFriendRequest,
} = require('../controllers/friendController');

// Gửi lời mời kết bạn
router.post('/send', sendFriendRequest);

// Hủy lời mời kết bạn
router.post('/cancel', cancelFriendRequest);

// Chấp nhận lời mời kết bạn
router.post('/accept', acceptFriendRequest);

// Xóa bạn bè
router.post('/remove', removeFriend);

// Xóa lời mời kết bạn từ người nhận
router.post('/delete-received', deleteReceivedFriendRequest);

module.exports = router;
