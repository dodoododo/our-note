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
      unique: true, // Email không được trùng
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
      private: true, // Đánh dấu để sau này không trả về client
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Middleware: Mã hóa password trước khi save
 */
userSchema.pre('save', async function () {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
});

/**
 * Method: Kiểm tra password nhập vào có khớp với password đã mã hóa không
 */
userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;