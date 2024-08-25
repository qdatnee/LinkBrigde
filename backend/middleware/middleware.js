const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// Cấu hình multer để xử lý upload file
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn kích thước tệp: 5MB
  fileFilter(req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Tệp phải là hình ảnh (jpeg, jpg, png)'));
  }
}).single('file');

// Xác thực token JWT
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'Token không được cung cấp' });

  try {
    const decoded = jwt.verify(token, 'your_jwt_secret'); // Thay 'your_jwt_secret' bằng secret của bạn
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ msg: 'Token không hợp lệ' });
  }
};

// Kiểm tra quyền truy cập của người dùng
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ msg: 'Bạn không có quyền truy cập' });
    }
    next();
  };
};

module.exports = { upload, authenticate, authorize };
