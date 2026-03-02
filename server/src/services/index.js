const authService = require('./auth.service');
const userService = require('./user.service');
const tokenService = require('./token.service');
const groupService = require('./group.service');
const eventService = require('./event.service');
const invitationService = require('./invitation.service');
const noteService = require('./note.service'); 
// Sau này có thêm noteService thì require vào đây luôn

module.exports = {
  authService,
  userService,
  tokenService,
  groupService,
  eventService,
  invitationService,
  noteService, 
};