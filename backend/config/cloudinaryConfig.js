const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: 'ds545ezu5',
  api_key: '491414232219791',
  api_secret: 'RygxlMVUHUDTqnOXwCz6wnjbwx8'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user_uploads',
    allowed_formats: ['jpg', 'png'],
  },
});

module.exports = {
  cloudinary,
  storage,
};
