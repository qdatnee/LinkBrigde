// routes/auth.js
const express = require('express');
const {
  registerUser,
  verifyOtp,
  loginUser,
  loginWithOtp,
  sendOtp,
  uploadProfilePicture,
  uploadCoverPhoto,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const upload = require('../middlewares/multer');

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

// Upload ảnh đại diện
router.post('/upload-profile-picture/:userId', upload.single('picture'), uploadProfilePicture);

// Upload ảnh bìa
router.post('/upload-cover-photo/:userId', upload.single('picture'), uploadCoverPhoto);

// Cập nhật thông tin người dùng
router.put('/update-profile/:userId', updateProfile);

// Thay đổi mật khẩu
router.put('/change-password/:userId', changePassword);

module.exports = router;
