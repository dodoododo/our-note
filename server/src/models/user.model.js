const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Email không hợp lệ');
        }
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      private: true,
    },
    // --- THÊM 2 TRƯỜNG NÀY CHO TÍNH NĂNG SETTINGS ---
    profile_pic_url: {
      type: String,
      default: '',
    },
    theme_hue: {
      type: Number,
      default: 250, // Màu mặc định
    },
    // ------------------------------------------------
  },
  {
    timestamps: true,
  }
);

/**
 * Static: Kiểm tra email đã tồn tại chưa
 * Hàm này được gọi trực tiếp từ Model: User.isEmailTaken(email)
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  // Tìm user có email trùng, nhưng ID khác excludeUserId (dùng khi update profile)
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user; // Trả về true nếu tìm thấy, false nếu không
};

/**
 * Method: Kiểm tra password (dùng khi login)
 * Hàm này được gọi từ instance user: user.isPasswordMatch(pass)
 */
userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

/**
 * Middleware: Mã hóa password trước khi save
 */
userSchema.pre('save', async function () {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;