const mongoose = require('mongoose');

const groupSchema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['family', 'couple', 'friends', 'work'], required: true },
    avatar_url: { type: String, default: '' },
    members: [{ type: String, trim: true, lowercase: true }],
    
    // --- 👇 THAY ĐỔI CẤU TRÚC LƯU TRỮ 👇 ---
    // Thay vì Map, ta dùng Array of Objects để tránh lỗi dấu chấm trong email
    member_names: [{
      _id: false, // Không cần tạo ID cho sub-document này
      email: String,
      name: String
    }],
    member_roles: [{
      _id: false,
      email: String,
      role: String
    }],
    // ---------------------------------------

    owner: { type: String, required: true, trim: true, lowercase: true },
    couple_start_date: { type: Date },
    description: { type: String, trim: true },
    color: { type: String, default: '#4F46E5' },
    
    // Settings
    notifications_enabled: { type: Boolean, default: true },
    notify_on_task_assignment: { type: Boolean, default: true },
    notify_on_event_changes: { type: Boolean, default: true },
    notify_on_new_notes: { type: Boolean, default: false },
    is_private: { type: Boolean, default: true },
    allow_member_invites: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;

        // --- 👇 MAGIC TRANSFORMATION 👇 ---
        // Biến Array trong DB thành Object { email: value } trả về cho Frontend
        // Frontend sẽ không biết là DB đã thay đổi cấu trúc
        
        const namesObj = {};
        if (ret.member_names && Array.isArray(ret.member_names)) {
          ret.member_names.forEach(item => {
            if (item.email) namesObj[item.email] = item.name;
          });
        }
        ret.member_names = namesObj;

        const rolesObj = {};
        if (ret.member_roles && Array.isArray(ret.member_roles)) {
          ret.member_roles.forEach(item => {
            if (item.email) rolesObj[item.email] = item.role;
          });
        }
        ret.member_roles = rolesObj;
        // ---------------------------------
      },
    },
  }
);

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;