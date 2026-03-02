const mongoose = require('mongoose');

const noteSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
    group_id: {
      type: String, // Kept as string to prevent ObjectId casting errors
      required: true,
    },
    author_email: {
      type: String,
      required: true,
    },
    author_name: {
      type: String,
      required: true,
    },
    last_edited_by: {
      type: String,
    },
    last_edited_name: {
      type: String,
    },
    is_pinned: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: '#ffffff',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// We removed the missing plugins to prevent the app crash

/**
 * @typedef Note
 */
const Note = mongoose.model('Note', noteSchema);

module.exports = Note;