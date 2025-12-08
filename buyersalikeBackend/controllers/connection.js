const models = require('../models');
const { Op } = require('sequelize');
const { createNotification } = require('../utils/notificationService');

// Request a connection
exports.requestConnection = async (req, res, next) => {
  try {
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver ID is required' });
    }

    const existing = await models.Connection.findOne({
      where: { requesterId: req.user.id, receiverId }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Connection request already sent or exists' });
    }

    const connection = await models.Connection.create({
      requesterId: req.user.id,
      receiverId,
      status: 'pending'
    });

    res.status(201).json({ success: true, data: connection });

    // Notification to the receiver about a new connection request
    const requesterUser = await models.User.findByPk(req.user.id);
    const receiverUser = await models.User.findByPk(receiverId);

    if (receiverUser && requesterUser) {
      await createNotification(
        receiverUser.id,
        'new_connection_request',
        `${requesterUser.username} has sent a connection request.`,
        'Connection',
        connection.id
      );

      // Notification to admin (optional, if admin needs to see all connection requests)
      await createNotification(
        'admin',
        'admin_new_connection_request',
        `User ${requesterUser.username} (${requesterUser.id}) has sent a connection request to ${receiverUser.username} (${receiverUser.id}).`,
        'Connection',
        connection.id
      );
    }    
  } catch (err) {
    next(err);
  }
};

// Accept a connection
exports.acceptConnection = async (req, res, next) => {
  try {
      const { connectionId } = req.params;
      const connection = await models.Connection.findByPk(connectionId);

      if (!connection || connection.receiverId !== req.user.id || connection.status !== 'pending') {
          return res.status(404).json({ success: false, message: 'Connection request not found or invalid action' });
      }

      connection.status = 'connected';
      connection.connectedAt = new Date();
      await connection.save();

      res.status(200).json({ success: true, data: connection });

    // Notifications for both parties and admin
    const requesterUser = await models.User.findByPk(connection.requesterId);
    const receiverUser = await models.User.findByPk(req.user.id);

    if (requesterUser && receiverUser) {
      // Notification to the requester that their request has been accepted
      await createNotification(
        requesterUser.id,
        'connection_accepted',
        `${receiverUser.username} has accepted connection request.`,
        'Connection',
        connection.id
      );

      // Notification to the receiver (current user) that they accepted a connection
      await createNotification(
        receiverUser.id,
        'connection_accepted_confirmation',
        `Accepted ${requesterUser.username}'s connection request.`,
        'Connection',
        connection.id
      );

      // Notification to admin
      await createNotification(
        'admin',
        'admin_connection_accepted',
        `User ${receiverUser.username} (${receiverUser.id}) accepted a connection request from ${requesterUser.username} (${requesterUser.id}).`,
        'Connection',
        connection.id
      );
    }      
  } catch (err) {
      next(err);
  }
};

// Reject a connection
exports.rejectConnection = async (req, res, next) => {
  try {
    const { connectionId } = req.params;

    const connection = await models.Connection.findByPk(connectionId);

    if (!connection || connection.receiverId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Connection not found' });
    }

    connection.status = 'rejected';
    connection.rejectedAt = new Date();
    await models.Connection.save();

    res.status(200).json({ success: true, data: connection });

    // Notifications for both parties and admin
    const requesterUser = await models.User.findByPk(connection.requesterId);
    const receiverUser = await models.User.findByPk(req.user.id);

    if (requesterUser && receiverUser) {
      // Notification to the requester that their request has been rejected
      await createNotification(
        requesterUser.id,
        'connection_rejected',
        `${receiverUser.username} has rejected connection request.`,
        'Connection',
        connection.id
      );

      // Notification to the receiver (current user) that they rejected a connection
      await createNotification(
        receiverUser.id,
        'connection_rejected_confirmation',
        `Rejected ${requesterUser.username}'s connection request.`,
        'Connection',
        connection.id
      );

      // Notification to admin
      await createNotification(
        'admin',
        'admin_connection_rejected',
        `User ${receiverUser.username} (${receiverUser.id}) rejected a connection request from ${requesterUser.username} (${requesterUser.id}).`,
        'Connection',
        connection.id
      );
    }    
  } catch (err) {
    next(err);
  }
};

// Disconnect a connection
exports.disconnectConnection = async (req, res, next) => {
  try {
      const { connectionId } = req.params;
      const currentUserId = req.user.id;

      const connection = await models.Connection.findOne({
          where: {
              [models.Sequelize.Op.or]: [
                  {
                      requesterId: currentUserId,
                      receiverId: connectionId,
                      status: 'connected',
                  },
                  {
                      requesterId: connectionId,
                      receiverId: currentUserId,
                      status: 'connected',
                  },
              ],
          },
      });

      if (!connection) {
          return res.status(404).json({ success: false, message: 'Connection not found' });
      }

      connection.status = 'disconnected';
      connection.disconnectedAt = new Date();
      await connection.save();

      res.status(200).json({ success: true, data: connection });

    // Notifications for both parties and admin
    const disconnectedByUser = await models.User.findByPk(currentUserId);
    const otherUser = await models.User.findByPk(connection.requesterId === currentUserId ? connection.receiverId : connection.requesterId);

    if (disconnectedByUser && otherUser) {
      // Notification to the user who initiated the disconnect
      await createNotification(
        disconnectedByUser.id,
        'connection_disconnected_self',
        `Disconnected from ${otherUser.username}.`,
        'Connection',
        connection.id
      );

      // Notification to the other user that they have been disconnected
      await createNotification(
        otherUser.id,
        'connection_disconnected_other',
        `${disconnectedByUser.username} has disconnected.`,
        'Connection',
        connection.id
      );

      // Notification to admin
      await createNotification(
        'admin',
        'admin_connection_disconnected',
        `User ${disconnectedByUser.username} (${disconnectedByUser.id}) disconnected from ${otherUser.username} (${otherUser.id}).`,
        'Connection',
        connection.id
      );
    }      
  } catch (err) {
      next(err);
  }
};

// Get all connections of a user
exports.getUserConnections = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const connections = await models.Connection.findAll({
      where: {
        [Op.or]: [
          { requesterId: userId },
          { receiverId: userId }
        ],
        status: 'connected'
      },
      include: [
        {
          model: models.User,
          as: 'requester',
          attributes: ['id', 'firstName', 'lastName', 'username', 'profilePhoto', 'state', 'country', 'biodata', 'occupation']
        },
        {
          model: models.User,
          as: 'receiver',
          attributes: ['id', 'firstName', 'lastName', 'username', 'profilePhoto', 'state', 'country', 'biodata', 'occupation']
        }
      ]
    });

    // Filter to only return the "other user" per connection
    const otherUsers = connections.map(connection => {
      const requester = connection.requester;
      const receiver = connection.receiver;

      return requester.id.toString() === userId.toString() ? receiver : requester;
    });

    res.status(200).json({ success: true, data: otherUsers });
  } catch (err) {
    next(err);
  }
};

// Get the connection status between two users
exports.getConnectionStatus = async (req, res, next) => {
  try {
    const { userId, targetUserId } = req.params;

    const connection = await models.Connection.findOne({
      where: {
        [Op.or]: [
          { requesterId: userId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: userId }
        ]
      }
    });

    if (!connection) {
      return res.status(200).json({ success: true, status: 'none' });
    }

    res.status(200).json({ success: true, status: connection.status });
  } catch (err) {
    next(err);
  }
};

exports.getAvailableConnection = async (req, res, next) => {
  try {
      const currentUserId = req.user.id;

      // Find all users excluding the current user
      const allUsers = await models.User.findAll({
          where: {
              id: {
                  [models.Sequelize.Op.ne]: currentUserId,
              },
          },
          attributes: ['id', 'firstName', 'lastName', 'username', 'profilePhoto', 'state', 'country', 'biodata'],
      });

      // Find all pending connection requests sent by the current user
      const sentPendingRequests = await models.Connection.findAll({
          where: {
              requesterId: currentUserId,
              status: 'pending',
          },
          attributes: ['receiverId'],
      });
      const sentPendingRequestUserIds = sentPendingRequests.map(conn => conn.receiverId);

      // Find all pending connection requests received by the current user
      const receivedPendingRequests = await models.Connection.findAll({
          where: {
              receiverId: currentUserId,
              status: 'pending',
          },
          attributes: ['requesterId'],
      });
      const receivedPendingRequestUserIds = receivedPendingRequests.map(conn => conn.requesterId);

      // Find all users the current user is already connected with (as requester)
      const connectedAsRequester = await models.Connection.findAll({
          where: {
              requesterId: currentUserId,
              status: 'connected',
          },
          attributes: ['receiverId'],
      });
      const connectedAsRequesterIds = connectedAsRequester.map(conn => conn.receiverId);

      // Find all users the current user is already connected with (as receiver)
      const connectedAsReceiver = await models.Connection.findAll({
          where: {
              receiverId: currentUserId,
              status: 'connected',
          },
          attributes: ['requesterId'],
      });
      const connectedAsReceiverIds = connectedAsReceiver.map(conn => conn.requesterId);

      // Combine all connected user IDs
      const allConnectedUserIds = [...connectedAsRequesterIds, ...connectedAsReceiverIds];

      // Filter out users who have already been requested or who have requested the current user
      const notYetInteracted = allUsers.filter(user =>
          !sentPendingRequestUserIds.includes(user.id) &&
          !receivedPendingRequestUserIds.includes(user.id)
      );

      // Further filter out users the current user is already connected with
      const availableConnections = notYetInteracted.filter(user =>
          !allConnectedUserIds.includes(user.id)
      );

      res.status(200).json({
          success: true,
          count: availableConnections.length,
          data: availableConnections.map(user => user.get({ plain: true })),
      });
  } catch (err) {
      next(err);
  }
};

exports.getPendingConnections = async (req, res, next) => {
    try {
        const pending = await models.Connection.findAll({
            where: {
                receiverId: req.user.id,
                status: 'pending'
            },
            include: [{
                model: models.User,
                as: 'requester',
                attributes: ['id', 'firstName', 'lastName', 'username', 'profilePhoto', 'state', 'country', 'biodata'] // Include necessary user info
            }]
        });
        res.status(200).json({ success: true, data: pending });
    } catch (err) {
        next(err);
    }
};

exports.getRequestedConnections = async (req, res, next) => {
  try {
      const currentUserId = req.user.id;

      const requestedConnections = await models.Connection.findAll({
          where: {
              requesterId: currentUserId,
              status: 'pending',
          },
          include: [
              {
                  model: models.User,
                  as: 'receiver', // Alias for the user who received the request
                  attributes: ['id', 'firstName', 'lastName', 'profilePhoto', 'state', 'country', 'biodata'], // Adjust attributes as needed
              },
          ],
      });

      res.status(200).json({
          success: true,
          count: requestedConnections.length,
          data: requestedConnections,
      });
  } catch (err) {
      next(err);
  }
};

exports.cancelConnectionRequest = async (req, res, next) => {
  try {
      const currentUserId = req.user.id;
      const { connectionId } = req.params;

      const connection = await models.Connection.findOne({
          where: {
              id: connectionId,
              requesterId: currentUserId,
              status: 'pending',
          },
      });

      if (!connection) {
          return res.status(404).json({ success: false, message: 'Connection request not found or cannot be cancelled.' });
      }

      await connection.destroy();

      res.status(200).json({ success: true, message: 'Connection request cancelled successfully.' });

    // Notifications for both parties and admin
    const requesterUser = await models.User.findByPk(currentUserId);
    const receiverUser = await models.User.findByPk(connection.receiverId);

    if (requesterUser && receiverUser) {
      // Notification to the user who cancelled the request
      await createNotification(
        requesterUser.id,
        'connection_request_cancelled_self',
        `Cancelled connection request to ${receiverUser.username}.`,
        'Connection',
        connection.id
      );

      // Notification to the receiver that the request was cancelled
      await createNotification(
        receiverUser.id,
        'connection_request_cancelled_other',
        `${requesterUser.username} has cancelled their connection request.`,
        'Connection',
        connection.id
      );

      // Notification to admin
      await createNotification(
        'admin',
        'admin_connection_request_cancelled',
        `User ${requesterUser.username} (${requesterUser.id}) cancelled a connection request to ${receiverUser.username} (${receiverUser.id}).`,
        'Connection',
        connection.id
      );
    }      
  } catch (err) {
      next(err);
  }
};