const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://lequangquocdat12c2:Lqqd1906%5E%5E@socail-networking.t7pu7.mongodb.net/', {
      // `useNewUrlParser` và `useUnifiedTopology` không còn cần thiết từ MongoDB driver version 4.0.0
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
