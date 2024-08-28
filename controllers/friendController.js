const User = require('../models/User');

// Gửi lời mời kết bạn
const sendFriendRequest = async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;

        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        if (!sender || !receiver) {
            return res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }

        if (receiver.friendRequestsReceived.includes(senderId)) {
            return res.status(400).json({ message: 'Lời mời kết bạn đã được gửi.' });
        }

        sender.friendRequestsSent.push(receiverId);
        receiver.friendRequestsReceived.push(senderId);

        await sender.save();
        await receiver.save();

        return res.status(200).json({ message: 'Lời mời kết bạn đã được gửi.' });
    } catch (error) {
        return res.status(500).json({ message: 'Có lỗi xảy ra.', error });
    }
};

// Hủy lời mời kết bạn
const cancelFriendRequest = async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;

        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        if (!sender || !receiver) {
            return res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }

        sender.friendRequestsSent = sender.friendRequestsSent.filter(id => id.toString() !== receiverId);
        receiver.friendRequestsReceived = receiver.friendRequestsReceived.filter(id => id.toString() !== senderId);

        await sender.save();
        await receiver.save();

        return res.status(200).json({ message: 'Lời mời kết bạn đã bị hủy.' });
    } catch (error) {
        return res.status(500).json({ message: 'Có lỗi xảy ra.', error });
    }
};

// Chấp nhận lời mời kết bạn
const acceptFriendRequest = async (req, res) => {
    try {
        const { userId, friendId } = req.body;

        const user = await User.findById(userId);
        const friend = await User.findById(friendId);

        if (!user || !friend) {
            return res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }

        if (!user.friendRequestsReceived.includes(friendId)) {
            return res.status(400).json({ message: 'Không có lời mời kết bạn.' });
        }

        user.friends.push(friendId);
        friend.friends.push(userId);

        user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id.toString() !== friendId);
        friend.friendRequestsSent = friend.friendRequestsSent.filter(id => id.toString() !== userId);

        user.friends_count += 1;
        friend.friends_count += 1;

        await user.save();
        await friend.save();

        return res.status(200).json({ message: 'Đã chấp nhận lời mời kết bạn.' });
    } catch (error) {
        return res.status(500).json({ message: 'Có lỗi xảy ra.', error });
    }
};

// Xóa bạn bè
const removeFriend = async (req, res) => {
    try {
        const { userId, friendId } = req.body;

        const user = await User.findById(userId);
        const friend = await User.findById(friendId);

        if (!user || !friend) {
            return res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }

        user.friends = user.friends.filter(id => id.toString() !== friendId);
        friend.friends = friend.friends.filter(id => id.toString() !== userId);

        user.friends_count -= 1;
        friend.friends_count -= 1;

        await user.save();
        await friend.save();

        return res.status(200).json({ message: 'Đã xóa bạn bè.' });
    } catch (error) {
        return res.status(500).json({ message: 'Có lỗi xảy ra.', error });
    }
};

// Xóa lời mời kết bạn từ người nhận
const deleteReceivedFriendRequest = async (req, res) => {
    try {
        const { userId, senderId } = req.body;

        const user = await User.findById(userId);
        const sender = await User.findById(senderId);

        if (!user || !sender) {
            return res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }

        user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id.toString() !== senderId);
        sender.friendRequestsSent = sender.friendRequestsSent.filter(id => id.toString() !== userId);

        await user.save();
        await sender.save();

        return res.status(200).json({ message: 'Lời mời kết bạn đã bị xóa.' });
    } catch (error) {
        return res.status(500).json({ message: 'Có lỗi xảy ra.', error });
    }
};

module.exports = {
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    removeFriend,
    deleteReceivedFriendRequest,
};
