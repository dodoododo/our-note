const authService = require('./auth.service');
const userService = require('./user.service');
const tokenService = require('./token.service');
const groupService = require('./group.service');
// Sau này có thêm noteService thì require vào đây luôn

module.exports = {
  authService,
  userService,
  tokenService,
  groupService,
};