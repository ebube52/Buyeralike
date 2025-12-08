const express = require('express');
const models = require('../models');
const {
    requestConnection,
    acceptConnection,
    rejectConnection,
    disconnectConnection,
    getUserConnections,
    getConnectionStatus,
    getAvailableConnection,
    getPendingConnections,
    getRequestedConnections, 
    cancelConnectionRequest,
} = require('../controllers/connection');

const { protect, checkAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router
    .route('/')
    .post(protect, requestConnection); // User sends a connection request

router
    .route('/accept/:connectionId')
    .post(protect, acceptConnection); // Accept a pending connection

router
    .route('/reject/:connectionId')
    .post(protect, rejectConnection); // Reject a pending connection

router
    .route('/disconnect/:connectionId')
    .delete(protect, disconnectConnection); // Disconnect an existing connection

router
    .route('/user/:userId')
    .get(checkAuth, getUserConnections); // Get all connections for a user

router
    .route('/status/:userId/:targetUserId')
    .get(checkAuth, getConnectionStatus); // Get connection status between two users

router
    .route('/available')
    .get(protect, getAvailableConnection); // Get all users sorted by connection status

router
    .route('/requests/pending')
    .get(protect, getPendingConnections); // Get pending connection requests for the logged-in user

router
    .route('/requests/sent')
    .get(protect, getRequestedConnections); // Get connection requests sent by the logged-in user

router
    .route('/requests/cancel/:connectionId')
    .delete(protect, cancelConnectionRequest); // Cancel a connection request sent by the logged-in user

module.exports = router;