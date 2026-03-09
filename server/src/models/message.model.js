const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  group_id: { 
    type: String, // or mongoose.Schema.Types.ObjectId if your groups are ObjectIds
    required: true,
    index: true // Indexed for faster querying by group
  },
  sender_email: { 
    type: String, 
    required: true 
  },
  sender_name: { 
    type: String 
  },
  content: { 
    type: String, 
    required: true 
  },
  read_by: { 
    type: [String], 
    default: [] 
  },
  message_type: { 
    type: String, 
    enum: ['text', 'system'], 
    default: 'text' 
  }
}, { 
  // Force Mongoose to use snake_case to match your frontend types
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  } 
});

module.exports = mongoose.model('Message', messageSchema);