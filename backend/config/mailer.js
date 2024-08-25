const nodemailer = require('nodemailer');

// Tạo transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail', // Hoặc nhà cung cấp dịch vụ email khác
  auth: {
    user: '1721031660@dntu.edu.vn',
    pass: 'pvvi rxuk btbf llkf'
  }
});

// Tạo OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // OTP 6 chữ số
};

// Gửi email OTP
const sendOtpEmail = (email, otp) => {
  const mailOptions = {
    from: 'LinkBridge',
    to: email,
    subject: 'Mã xác minh LinkBridge',
    text: `Mã OTP của bạn là ${otp}`
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail, generateOtp };
