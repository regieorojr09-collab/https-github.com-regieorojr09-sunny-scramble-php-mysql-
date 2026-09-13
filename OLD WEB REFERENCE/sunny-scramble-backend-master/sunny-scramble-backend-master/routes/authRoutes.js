const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validation/schemas');
const { registerUser, loginUser } = require('../controllers/authController');

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);

module.exports = router;