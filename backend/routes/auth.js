const express = require('express');
const { registerUser, verifyOtp, loginUser, loginWithOtp, sendOtp, uploadPicture, uploadImage, upload } = require('../controllers/authController');

const router = express.Router();

// Đăng ký người dùng
router.post('/register', registerUser);

// Xác thực OTP
router.post('/verify-otp', verifyOtp);

// Đăng nhập bằng mật khẩu
router.post('/login', loginUser);

// Gửi OTP
router.post('/send-otp', sendOtp);

// Đăng nhập bằng OTP
router.post('/login-with-otp', loginWithOtp);

// Upload ảnh đại diện hoặc ảnh bìa
router.post('/upload-picture', upload.single('picture'), uploadPicture);

// Upload ảnh từ bài viết
router.post('/upload-image', upload.single('image'), uploadImage);

module.exports = router;
