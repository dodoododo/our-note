const express = require('express');
const validate = require('../../middlewares/validate');
const authController = require('../../controllers/auth.controller');

const router = express.Router();

router.post('/register', authController.register); // validate(authValidation.register) nếu có
router.post('/login', authController.login);

module.exports = router;