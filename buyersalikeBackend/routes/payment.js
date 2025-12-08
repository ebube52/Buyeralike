// routes/payment.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    createCheckoutSession,
    stripeWebhook,
    checkUserMembershipStatus,
    retrieveCheckoutSession
} = require('../controllers/paymentController');

// Route for creating a Stripe Checkout Session
router.post('/create-checkout-session', protect, createCheckoutSession);

// Route for Stripe Webhooks
router.post('/stripe-webhook', stripeWebhook);

// NEW Route: Check user membership status
router.get('/check-membership', protect, checkUserMembershipStatus); // Protected route

// NEW Route: Retrieve Stripe Checkout Session status by ID
router.get('/session-status/:sessionId', protect, retrieveCheckoutSession); // Protected route

module.exports = router;