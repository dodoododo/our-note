const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const groupRoute = require('./group.route');
const eventRoute = require('./event.route');
const invitationRoute = require('./invitation.route');
// const userRoute = require('./user.route');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth', // Đường dẫn sẽ là /v1/auth/login
    route: authRoute,
  },
  {
    path: '/users', // Đường dẫn sẽ là /v1/auth/login
    route: userRoute,
  },
  {
    path: '/groups',
    route: groupRoute,
  },
  { 
    path: '/events', 
    route: eventRoute 
  },
  {
    path: '/invitations',
    route: invitationRoute,
  }
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;