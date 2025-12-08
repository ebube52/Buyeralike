// controllers/contactForm.js
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const models = require('../models');

// @desc    Submit a new contact form message
// @route   POST /api/v1/contact
// @access  Public
exports.submitForm = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, subject, message } = req.body;

  if (!firstName || !lastName || !email || !message) {
    return next(new ErrorResponse('Please include first name, last name, email, and message.', 400));
  }

  const submission = await models.ContactForm.create({
    firstName,
    lastName,
    email,
    subject,
    message,
  });

  res.status(201).json({
    success: true,
    data: submission,
    message: 'Form submitted successfully.',
  });
});

// @desc    Get all contact form submissions (Admin only)
// @route   GET /api/v1/contact
// @access  Private (Admin)
exports.getSubmissions = asyncHandler(async (req, res, next) => {
  const submissions = await models.ContactForm.findAll({
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json({
    success: true,
    count: submissions.length,
    data: submissions,
  });
});