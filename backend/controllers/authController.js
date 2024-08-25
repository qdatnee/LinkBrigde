const User = require('../models/User');
const { sendOtpEmail, generateOtp } = require('../config/mailer');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const multer = require('multer');

// Cấu hình multer để xử lý upload file
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// URL ảnh mặc định
const DEFAULT_PROFILE_PICTURE = 'https://cellphones.com.vn/sforum/wp-content/uploads/2023/10/avatar-trang-4.jpg';
const DEFAULT_COVER_PICTURE = 'https://inkythuatso.com/uploads/thumbnails/800/2022/04/11-6-2015-2-57-50-pm-04-22-58-48.jpg';

// Chuyển đổi tên để chuẩn hóa
const normalizeName = (name) => {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Đăng ký người dùng
const registerUser = async (req, res) => {
  try {
    const { email, phone_number, password, full_name, date_of_birth, gender } = req.body;

    // Kiểm tra dữ liệu
    if (!validator.isEmail(email)) return res.status(400).json({ msg: 'Email không hợp lệ' });
    if (!validator.isMobilePhone(phone_number, 'vi-VN')) return res.status(400).json({ msg: 'Số điện thoại không hợp lệ' });
    if (!validator.isLength(password, { min: 6 })) return res.status(400).json({ msg: 'Mật khẩu phải có ít nhất 6 ký tự' });
    if (password.includes(' ')) return res.status(400).json({ msg: 'Mật khẩu không được chứa khoảng trắng' });

    const today = new Date();
    const dob = new Date(date_of_birth);
    const age = today.getFullYear() - dob.getFullYear();
    if (age < 16 || age > 100) return res.status(400).json({ msg: 'Tuổi phải từ 16 đến 100' });

    // Chuyển đổi tên thành chuẩn hóa
    const normalizedFullName = normalizeName(full_name);

    // Kiểm tra xem email hoặc số điện thoại đã tồn tại chưa
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'Email đã được sử dụng' });

    user = await User.findOne({ phone_number });
    if (user) return res.status(400).json({ msg: 'Số điện thoại đã được sử dụng' });

    // Tạo OTP và gửi email xác nhận
    const otp = generateOtp();
    await sendOtpEmail(email, otp);

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo người dùng mới
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
      otp_expiry: Date.now() + 3600000 // OTP có hiệu lực trong 1 giờ
    });

    await newUser.save();
    res.status(200).json({ msg: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// Xác thực OTP
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

    // Xác nhận tài khoản
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

// Đăng nhập bằng mật khẩu
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
  
        // Lock account if failed attempts reach 3
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
// Gửi OTP
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

    // Tạo OTP và gửi email
    const otp = generateOtp();
    await sendOtpEmail(email, otp);

    // Cập nhật OTP và thời gian hết hạn
    user.otp = otp;
    user.otp_expiry = Date.now() + 3600000; // OTP có hiệu lực trong 1 giờ
    await user.save();

    res.status(200).json({ msg: 'Mã OTP đã được gửi' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// Đăng nhập bằng OTP
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

    // Xác nhận tài khoản
    user.otp = undefined;
    user.otp_expiry = undefined;
    await user.save();

    res.status(200).json({ msg: 'Đăng nhập thành công' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// Upload ảnh đại diện
const uploadPicture = async (req, res) => {
  try {
    // Xử lý ảnh tải lên
    // Lưu trữ hoặc xử lý ảnh ở đây
    res.status(200).json({ msg: 'Ảnh đã được tải lên thành công' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// Upload ảnh bìa
const uploadImage = async (req, res) => {
  try {
    // Xử lý ảnh tải lên
    // Lưu trữ hoặc xử lý ảnh ở đây
    res.status(200).json({ msg: 'Ảnh đã được tải lên thành công' });
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
  uploadPicture,
  uploadImage,
  upload
};
