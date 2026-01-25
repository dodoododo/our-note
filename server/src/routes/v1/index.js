const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
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
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;