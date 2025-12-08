// controllers/paymentController.js
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const models = require('../models'); // Your Sequelize models
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createNotification } = require('../utils/notificationService');
const { Op } = require('sequelize'); // Import Op for Sequelize operators


// @desc    Check User Membership Status
// @route   GET /api/v1/payments/check-membership
// @access  Private (User must be logged in)
exports.checkUserMembershipStatus = asyncHandler(async (req, res, next) => {
    const userId = req.user.id; // From your protect middleware

    // Calculate one month ago date
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const latestSuccessfulPayment = await models.Payment.findOne({
        where: {
            userId: userId,
            status: 'succeeded',
            createdAt: {
                [Op.gte]: oneMonthAgo, // Payment date is within the last month
            },
        },
        order: [['createdAt', 'DESC']], // Get the most recent successful payment
    });

    const isPayingMember = !!latestSuccessfulPayment; // If a payment record exists, they are a paying member

    res.status(200).json({
        success: true,
        isPayingMember: isPayingMember,
        // Optionally send payment expiry date if needed
        // lastPaymentDate: latestSuccessfulPayment ? latestSuccessfulPayment.createdAt : null,
    });
});

// @desc    Create Stripe Checkout Session
// @route   POST /api/v1/payments/create-checkout-session
// @access  Private (User must be logged in)
exports.createCheckoutSession = asyncHandler(async (req, res, next) => {
    const { amount, currency, description, serviceId, quantity = 1 } = req.body;
    const userId = req.user.id; // From your protect middleware

    // Basic validation
    if (!amount || !currency || !description) {
        return next(new ErrorResponse('Please provide amount, currency, and description for the payment.', 400));
    }
    if (amount <= 0) {
        return next(new ErrorResponse('Amount must be positive.', 400));
    }

    try {
        // Create a new payment record in your DB as 'pending'
        const payment = await models.Payment.create({
            userId: userId,
            amount: Math.round(amount * 100), // Stripe expects amount in cents/lowest currency unit
            currency: currency.toLowerCase(),
            description: description,
            status: 'pending',
        });

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                            name: description,
                        },
                        unit_amount: Math.round(amount * 100),
                    },
                    quantity: quantity,
                },
            ],
            mode: 'payment',
            client_reference_id: payment.id,
            // IMPORTANT: Update these URLs to reflect your actual frontend success/cancel pages
            // You might want to pass the targetReceiverId back to the success URL
            success_url: `${process.env.FRONTEND_URL}/profile/connection?session_id={CHECKOUT_SESSION_ID}&status=success`,
            cancel_url: `${process.env.FRONTEND_URL}/profile/connection?status=cancelled`,
            metadata: {
                userId: userId,
                localPaymentId: payment.id,
            },
        });

        // Update the local payment record with the Stripe session ID
        payment.stripePaymentId = session.id;
        await payment.save();

        res.status(200).json({
            success: true,
            url: session.url, // Send the Stripe checkout URL to the frontend
            paymentId: payment.id,
        });

    } catch (error) {
        console.error('Stripe Checkout Session creation error:', error);
        return next(new ErrorResponse('Error creating checkout session: ' + error.message, 500));
    }
});

// @desc    Retrieve Stripe Checkout Session Status and potentially fulfill
// @route   GET /api/v1/payments/session-status/:sessionId
// @access  Private (User must be logged in)
exports.retrieveCheckoutSession = asyncHandler(async (req, res, next) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        return next(new ErrorResponse('Session ID is required.', 400));
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        const localPaymentId = session.client_reference_id;
        let localPayment = null;

        if (localPaymentId) {
            localPayment = await models.Payment.findByPk(localPaymentId);

            // If a local payment record exists and the Stripe session is complete and paid,
            // attempt to fulfill the service.
            if (localPayment && session.status === 'complete') {
                // Use the centralized fulfillment logic
                await fulfillPaymentAndService(localPayment, session);
            }
        }

        // Re-fetch localPayment to get its potentially updated status
        if (localPaymentId) {
            localPayment = await models.Payment.findByPk(localPaymentId);
        }

        res.status(200).json({
            success: true,
            session: {
                id: session.id,
                status: session.status, // 'open', 'complete', 'expired'
                payment_status: session.payment_status, // 'paid', 'unpaid', 'no_payment_required'
                amount_total: session.amount_total,
                currency: session.currency,
                customer_email: session.customer_details ? session.customer_details.email : null,
                metadata: session.metadata,
            },
            localPayment: localPayment ? {
                id: localPayment.id,
                status: localPayment.status,
                // Include other relevant fields if needed, e.g., userId
                userId: localPayment.userId,
            } : null,
        });

    } catch (error) {
        console.error('Error retrieving Stripe Checkout Session:', error);
        if (error.type === 'StripeInvalidRequestError') {
            return next(new ErrorResponse('Invalid Stripe Session ID.', 404));
        }
        // Catch more specific Stripe errors like 'StripeAPIError' etc. if needed
        return next(new ErrorResponse('Error retrieving session status: ' + error.message, 500));
    }
});


// @desc    Handle Stripe Webhooks
// @route   POST /api/v1/stripe-webhook
// @access  Public (Stripe calls this)
exports.stripeWebhook = asyncHandler(async (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log(`Webhook: Checkout session completed: ${session.id}`);

            const localPaymentId = session.client_reference_id;
            // No need to check !localPaymentId here; fulfillPaymentAndService will handle it.

            try {
                const payment = await models.Payment.findByPk(localPaymentId);

                if (!payment) {
                    console.error(`Webhook Error: Payment record not found for local ID ${localPaymentId} for session ${session.id}`);
                    // If the local payment record is genuinely missing (shouldn't happen with proper createCheckoutSession logic),
                    // you might log this as a critical error or have a manual recovery process.
                    return res.status(404).send('Payment record not found locally.');
                }

                // Use the centralized fulfillment logic
                await fulfillPaymentAndService(payment, session);
                // Optionally update the payment source if not already set (e.g., if set from frontend)
                if (!payment.source) {
                    payment.source = 'webhook';
                    await payment.save();
                }

            } catch (dbError) {
                console.error(`Webhook: Error updating payment or fulfilling service for session ${session.id}:`, dbError);
                return res.status(500).send('Database error during webhook processing.');
            }
            break;

        case 'checkout.session.async_payment_succeeded':
            // For asynchronous payment methods like SEPA Direct Debit that succeed later
            const asyncSuccessSession = event.data.object;
            console.log(`Webhook: Async payment succeeded for session: ${asyncSuccessSession.id}`);
            const asyncSuccessLocalPayment = await models.Payment.findByPk(asyncSuccessSession.client_reference_id);
            if (asyncSuccessLocalPayment) {
                await fulfillPaymentAndService(asyncSuccessLocalPayment, asyncSuccessSession);
            }
            break;

        case 'checkout.session.async_payment_failed':
            // For asynchronous payment methods that fail later
            const asyncFailSession = event.data.object;
            console.log(`Webhook: Async payment failed for session: ${asyncFailSession.id}`);
            const asyncFailLocalPayment = await models.Payment.findByPk(asyncFailSession.client_reference_id);
            if (asyncFailLocalPayment && asyncFailLocalPayment.status !== 'failed') { // Only update if not already failed
                asyncFailLocalPayment.status = 'failed';
                await asyncFailLocalPayment.save();
                await createNotification(
                    asyncFailLocalPayment.userId,
                    'payment_failed',
                    `Your payment for "${asyncFailLocalPayment.description}" failed after processing. Please try again.`,
                    'Payment',
                    asyncFailLocalPayment.id
                );
                console.warn(`Payment ${asyncFailLocalPayment.id} marked as failed due to async failure.`);
            }
            break;

        default:
            console.log(`Webhook: Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
});


// --- Helper function for fulfilling the service ---
// This centralizes the fulfillment logic, making it reusable and easier to maintain.
const fulfillPaymentAndService = async (localPayment, session) => {
    // Check if the payment has already been fulfilled by webhook or a prior call
    if (localPayment.status === 'succeeded') {
        console.log(`Payment ${localPayment.id} already fulfilled. Skipping.`);
        return true; // Indicate that fulfillment is done or not needed
    }

    if (session.payment_status === 'paid' && session.status === 'complete') {
        localPayment.status = 'succeeded';
        localPayment.stripePaymentId = session.id;
        await localPayment.save();

        const userId = session.metadata.userId; // Retrieve userId from metadata
        const userToUpdate = await models.User.findByPk(userId);

        if (userToUpdate) {
            const membershipExpires = new Date();
            membershipExpires.setMonth(membershipExpires.getMonth() + 1); // Extend for one month
            userToUpdate.isPayingMember = true;
            userToUpdate.membershipExpires = membershipExpires;
            await userToUpdate.save();
            console.log(`User ${userId} marked as paying member until ${membershipExpires} (via ${localPayment.source || 'checkout session'}).`);
        }

        await createNotification(
            localPayment.userId,
            'payment_succeeded',
            `Your payment of ${session.amount_total / 100} ${session.currency.toUpperCase()} for "${localPayment.description}" was successful. You can now connect with other users.`,
            'Payment',
            localPayment.id
        );
        console.log(`Payment ${localPayment.id} marked as succeeded and service fulfilled.`);
        return true;
    } else if (session.payment_status === 'unpaid' || session.status === 'expired') {
        // Handle cases where payment is unpaid or session expired
        localPayment.status = 'failed';
        await localPayment.save();
        await createNotification(
            localPayment.userId,
            'payment_failed',
            `Your payment for "${localPayment.description}" failed or was not completed. Please try again.`,
            'Payment',
            localPayment.id
        );
        console.warn(`Payment ${localPayment.id} marked as failed (via ${localPayment.source || 'checkout session'}).`);
        return false;
    }
    // If status is 'open' or 'processing', do nothing, await webhook or user retry
    return false;
};
