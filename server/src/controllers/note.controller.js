const noteService = require('../services/note.service');

const createNote = async (req, res) => {
  try {
    const note = await noteService.createNote(req.body, req.user);
    res.status(201).send(note); // 201: Created thành công
  } catch (error) {
    console.error("🔥 LỖI TẠO NOTE:", error);
    res.status(500).send({ message: `LỖI TẠO: ${error.message}` });
  }
};

const getNotes = async (req, res) => {
  try {
    const filter = req.query.group_id ? { group_id: req.query.group_id } : {};
    const options = { sortBy: req.query.sortBy };
    
    const result = await noteService.queryNotes(filter, options);
    
    if (result && result.results) {
      res.status(200).send(result.results);
    } else {
      res.status(200).send(result || []);
    }
  } catch (error) {
    console.error("🔥 LỖI LẤY DANH SÁCH NOTE:", error);
    res.status(500).send({ message: `LỖI LẤY DS: ${error.message}` });
  }
};

const getNote = async (req, res) => {
  try {
    const note = await noteService.getNoteById(req.params.noteId);
    if (!note) {
      return res.status(404).send({ message: 'Note not found' }); // 404: Không tìm thấy
    }
    res.status(200).send(note); // 200: OK
  } catch (error) {
    res.status(500).send({ message: `LỖI GET 1: ${error.message}` });
  }
};

const updateNote = async (req, res) => {
  try {
    const note = await noteService.updateNoteById(req.params.noteId, req.body, req.user);
    res.status(200).send(note);
  } catch (error) {
    res.status(500).send({ message: `LỖI CẬP NHẬT: ${error.message}` });
  }
};

const deleteNote = async (req, res) => {
  try {
    await noteService.deleteNoteById(req.params.noteId);
    res.status(204).send(); // 204: Xóa thành công, không có nội dung trả về
  } catch (error) {
    res.status(500).send({ message: `LỖI XÓA: ${error.message}` });
  }
};

module.exports = {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
};