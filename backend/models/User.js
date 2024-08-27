const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  phone_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  date_of_birth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  password: {
    type: String,
    required: true
  },
  profile_picture: {
    type: Buffer,
    default: 'https://cellphones.com.vn/sforum/wp-content/uploads/2023/10/avatar-trang-4.jpg'
  },
  cover_picture: {
    type: Buffer,
    default: 'https://inkythuatso.com/uploads/thumbnails/800/2022/04/11-6-2015-2-57-50-pm-04-22-58-48.jpg'
  },
  photo_album: [
    {
      type: Buffer
    }
  ],
  work: {
    type: String,
    default: ''
  },
  education: {
    type: String,
    default: ''
  },
  current_city: {
    type: String,
    default: ''
  },
  hometown: {
    type: String,
    default: ''
  },
  relationship_status: {
    type: String,
    enum: ['Single', 'In a relationship', 'Married', 'Divorced', 'Widowed'],
    default: 'Single'
  },
  friends_count: {
    type: Number,
    default: 0
  },
  activity_status: {
    type: String,
    enum: ['Online', 'Offline'],
    default: 'Offline'
  },
  otp: {
    type: String,
    default: ''
  },
  otp_expiry: {
    type: Date,
    default: null
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  is_locked: {
    type: Boolean,
    default: false
  },
  failed_login_attempts: {
    type: Number,
    default: 0
  },
  verification_date: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequestsSent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequestsReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});


module.exports = mongoose.model('User', UserSchema);
