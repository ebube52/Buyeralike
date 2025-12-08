// routes/contact.js
const express = require('express');
const { submitForm, getSubmissions } = require('../controllers/contactForm');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public route for submitting the form
router.route('/').post(submitForm);

// Admin-only route to retrieve all submissions
router.route('/').get(protect, authorize('adminL5'), getSubmissions);

module.exports = router;