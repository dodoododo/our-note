const httpStatus = require('http-status');
const Note = require('../models/note.model');
const ApiError = require('../utils/ApiError');

/**
 * Create a note
 */
const createNote = async (noteBody, user) => {
  // Lấy email và name an toàn từ object user
  const userEmail = user?.email || 'unknown@example.com';
  const userName = user?.full_name || user?.name || 'Unknown User';

  const payload = {
    ...noteBody,
    author_email: userEmail,
    author_name: userName,
    last_edited_by: userEmail,
    last_edited_name: userName,
  };
  
  return Note.create(payload);
};

/**
 * Query for notes
 */
const queryNotes = async (filter, options) => {
  try {
    // Luôn sắp xếp theo updated_at mới nhất (descending)
    const sortObj = { updated_at: -1 }; 
    
    // Nếu options có sortBy thì dùng nó, nhưng bọc trong try-catch để an toàn
    if (options && options.sortBy) {
      const parts = options.sortBy.split(':');
      if (parts.length === 2) {
        sortObj[parts[0]] = parts[1] === 'desc' ? -1 : 1;
      }
    }

    const notes = await Note.find(filter).sort(sortObj);
    return notes || []; // Luôn trả về mảng, kể cả khi rỗng
  } catch (error) {
    console.error("Error in queryNotes:", error);
    return []; // Trả về mảng rỗng thay vì làm sập server
  }
};

/**
 * Get note by id
 */
const getNoteById = async (id) => {
  return Note.findById(id);
};

/**
 * Update note by id
 */
const updateNoteById = async (noteId, updateBody, user) => {
  const note = await getNoteById(noteId);
  if (!note) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Note not found');
  }

  const userEmail = user?.email || 'unknown@example.com';
  const userName = user?.full_name || user?.name || 'Unknown User';

  const payload = {
    ...updateBody,
    last_edited_by: userEmail,
    last_edited_name: userName,
  };

  Object.assign(note, payload);
  await note.save();
  return note;
};

/**
 * Delete note by id
 */
const deleteNoteById = async (noteId) => {
  const note = await getNoteById(noteId);
  if (!note) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Note not found');
  }
  await note.deleteOne();
  return note;
};

module.exports = {
  createNote,
  queryNotes,
  getNoteById,
  updateNoteById,
  deleteNoteById,
};