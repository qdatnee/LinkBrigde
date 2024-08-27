const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendOtpEmail, generateOtp } = require('../config/mailer');
const validator = require('validator');
const cloudinary = require('../config/cloudinaryConfig');

const multer = require('multer');



// Multer configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Default image URLs
const DEFAULT_PROFILE_PICTURE = 'https://cellphones.com.vn/sforum/wp-content/uploads/2023/10/avatar-trang-4.jpg';
const DEFAULT_COVER_PICTURE = 'https://inkythuatso.com/uploads/thumbnails/800/2022/04/11-6-2015-2-57-50-pm-04-22-58-48.jpg';

// Normalize name
const normalizeName = (name) => {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Register user
const registerUser = async (req, res) => {
  try {
    const { email, phone_number, password, full_name, date_of_birth, gender } = req.body;

    // Validate input
    if (!validator.isEmail(email)) return res.status(400).json({ msg: 'Email không hợp lệ' });
    if (!validator.isMobilePhone(phone_number, 'vi-VN')) return res.status(400).json({ msg: 'Số điện thoại không hợp lệ' });
    if (!validator.isLength(password, { min: 6 })) return res.status(400).json({ msg: 'Mật khẩu phải có ít nhất 6 ký tự' });
    if (password.includes(' ')) return res.status(400).json({ msg: 'Mật khẩu không được chứa khoảng trắng' });

    const today = new Date();
    const dob = new Date(date_of_birth);
    const age = today.getFullYear() - dob.getFullYear();
    if (age < 16 || age > 100) return res.status(400).json({ msg: 'Tuổi phải từ 16 đến 100' });

    // Normalize full name
    const normalizedFullName = normalizeName(full_name);

    // Check if email or phone number already exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'Email đã được sử dụng' });

    user = await User.findOne({ phone_number });
    if (user) return res.status(400).json({ msg: 'Số điện thoại đã được sử dụng' });

    // Generate OTP and send email
    const otp = generateOtp();
    await sendOtpEmail(email, otp);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      email,
      phone_number,
      password: hashedPassword,
      full_name: normalizedFullName,
      date_of_birth,
      gender,
      profile_picture: DEFAULT_PROFILE_PICTURE,
      cover_picture: DEFAULT_COVER_PICTURE,
      otp,
      otp_expiry: Date.now() + 3600000 // OTP valid for 1 hour
    });

    await newUser.save();
    res.status(200).json({ msg: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ msg: 'Email và mã OTP là bắt buộc' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Người dùng không tồn tại' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ msg: 'Mã OTP không đúng' });
    }

    if (new Date() > user.otp_expiry) {
      return res.status(400).json({ msg: 'Mã OTP đã hết hạn' });
    }

    // Confirm account
    user.is_verified = true;
    user.otp = undefined;
    user.otp_expiry = undefined;
    await user.save();

    res.status(200).json({ msg: 'Xác thực thành công' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// Login with password
const loginUser = async (req, res) => {
  try {
    const { email, phone_number, password } = req.body;

    // Check if either email or phone number is provided
    if (!email && !phone_number) {
      return res.status(400).json({ msg: 'Email hoặc số điện thoại là bắt buộc' });
    }
    if (!password) {
      return res.status(400).json({ msg: 'Mật khẩu là bắt buộc' });
    }

    // Find user by email or phone number
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone_number) {
      user = await User.findOne({ phone_number });
    }

    if (!user) {
      return res.status(400).json({ msg: 'Người dùng không tồn tại' });
    }

    // Check if the account is locked
    if (user.is_locked) {
      return res.status(403).json({ msg: 'Tài khoản của bạn đã bị khóa' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment failed login attempts
      user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;

      // Lock account if failed attempts reach 5
      if (user.failed_login_attempts >= 5) {
        user.is_locked = true;
        await user.save();
        return res.status(403).json({ msg: 'Tài khoản của bạn đã bị khóa' });
      }

      const remainingAttempts = 5 - user.failed_login_attempts;
      await user.save();
      return res.status(400).json({
        msg: `Đăng nhập không thành công. Số lần thử còn lại: ${remainingAttempts}`,
        failed_login_attempts: user.failed_login_attempts
      });
    }

    // Reset failed login attempts and update activity status
    user.failed_login_attempts = 0;
    user.activity_status = 'Online'; // Set activity status to Online
    await user.save();

    res.status(200).json({ msg: 'Đăng nhập thành công' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// Send OTP
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ msg: 'Email là bắt buộc' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Người dùng không tồn tại' });
    }

    // Generate OTP and send email
    const otp = generateOtp();
    await sendOtpEmail(email, otp);

    // Update OTP and expiry
    user.otp = otp;
    user.otp_expiry = Date.now() + 3600000; // OTP valid for 1 hour
    await user.save();

    res.status(200).json({ msg: 'Mã OTP đã được gửi' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// Login with OTP
const loginWithOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ msg: 'Email và mã OTP là bắt buộc' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Người dùng không tồn tại' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ msg: 'Mã OTP không đúng' });
    }

    if (new Date() > user.otp_expiry) {
      return res.status(400).json({ msg: 'Mã OTP đã hết hạn' });
    }

    // Confirm login
    user.otp = undefined;
    user.otp_expiry = undefined;
    await user.save();

    res.status(200).json({ msg: 'Đăng nhập thành công' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// controllers/authController.js
const uploadProfilePicture = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'profile_pictures', resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const profilePictureUrl = result.secure_url;
    await User.findByIdAndUpdate(userId, { profile_picture: profilePictureUrl });

    res.status(200).json({ msg: 'Profile picture updated successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

const uploadCoverPhoto = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'cover_photos', resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const coverPhotoUrl = result.secure_url;
    await User.findByIdAndUpdate(userId, { cover_picture: coverPhotoUrl });

    res.status(200).json({ msg: 'Cover photo updated successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// Update user profile information
const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Normalize full name if provided
    if (updates.full_name) {
      updates.full_name = normalizeName(updates.full_name);
    }

    // Validate phone number and email if provided
    if (updates.phone_number && !validator.isMobilePhone(updates.phone_number, 'vi-VN')) {
      return res.status(400).json({ msg: 'Số điện thoại không hợp lệ' });
    }

    if (updates.email && !validator.isEmail(updates.email)) {
      return res.status(400).json({ msg: 'Email không hợp lệ' });
    }

    // Validate date of birth
    if (updates.date_of_birth) {
      const today = new Date();
      const dob = new Date(updates.date_of_birth);
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 16 || age > 100) {
        return res.status(400).json({ msg: 'Tuổi phải từ 16 đến 100' });
      }
    }

    // Update user profile
    await User.findByIdAndUpdate(userId, updates, { new: true });
    res.status(200).json({ msg: 'Profile updated successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { old_password, new_password } = req.body;

    // Validate new password
    if (!validator.isLength(new_password, { min: 6 })) return res.status(400).json({ msg: 'Mật khẩu phải có ít nhất 6 ký tự' });
    if (new_password.includes(' ')) return res.status(400).json({ msg: 'Mật khẩu không được chứa khoảng trắng' });

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ msg: 'Người dùng không tồn tại' });
    }

    // Check old password
    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Mật khẩu cũ không đúng' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ msg: 'Mật khẩu đã được thay đổi' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

module.exports = {
  registerUser,
  verifyOtp,
  loginUser,
  loginWithOtp,
  sendOtp,
  uploadProfilePicture,
  uploadCoverPhoto,
  updateProfile,
  changePassword
};
