const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const models = require('../models');
const { createNotification } = require('../utils/notificationService');

// @desc    Get all notifications (Admin only)
// @route   GET /api/v1/notifications/all
// @access  Private (Admin)
exports.getNotifications = asyncHandler(async (req, res, next) => {
  // Ensure only admins can access this route
  if (!req.user || !req.user.role || !req.user.role.includes('admin')) {
    return next(new ErrorResponse('Not authorized to view all notifications', 403));
  }

  const notifications = await models.Notification.findAll({
    order: [['createdAt', 'DESC']],
    include: [{
      model: models.User,
      as: 'recipient', // Use the 'recipient' alias defined in the association
      attributes: ['email', 'username'] // Include email and username of the recipient
    }]
  });

  // Map the notifications to include the recipient's email and username directly in the data
  const notificationsWithRecipientInfo = notifications.map(notification => ({
    ...notification.toJSON(), // Convert to a plain JavaScript object
    email: notification.recipient ? notification.recipient.email : null, // Add recipient email
    username: notification.recipient ? notification.recipient.username : null // Add recipient username
  }));

  res.status(200).json({
    success: true,
    count: notificationsWithRecipientInfo.length,
    data: notificationsWithRecipientInfo,
  });
});

// @desc    Get notifications for the authenticated user
// @route   GET /api/v1/notifications/user
// @access  Private (User)
exports.getNotificationsByUserId = asyncHandler(async (req, res, next) => {
  // Ensure a user is authenticated
  if (!req.user || !req.user.id) {
    return next(new ErrorResponse('Not authorized to view notifications', 401));
  }

  const notifications = await models.Notification.findAll({
    where: { userId: req.user.id }, // Filter by the authenticated user's ID
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json({
    success: true,
    count: notifications.length, // Or notificationsWithRecipientInfo.length if mapped
    data: notifications, // Or notificationsWithRecipientInfo if mapped
  });
});

// @desc    Mark a specific notification as read
// @route   PUT /api/v1/notifications/:notificationId/read
// @access  Private
exports.markNotificationAsRead = asyncHandler(async (req, res, next) => {
  const notification = await models.Notification.findOne({
    where: {
      id: req.params.notificationId,
      userId: req.user.id, // Ensure user can only mark their own notifications
    },
  });

  if (!notification) {
    return next(new ErrorResponse(`Notification not found or you don't have access`, 404));
  }

  notification.read = true;
  await notification.save();

  res.status(200).json({ success: true, data: notification });
});

// @desc    Mark all notifications for the authenticated user as read
// @route   PUT /api/v1/notifications/mark-all-read
// @access  Private
exports.markAllNotificationsAsRead = asyncHandler(async (req, res, next) => {
  await models.Notification.update(
    { read: true },
    {
      where: { userId: req.user.id, read: false },
    }
  );

  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

// @desc    Get count of unread notifications for the authenticated user
// @route   GET /api/v1/notifications/unread-count
// @access  Private
exports.getUnreadNotificationsCount = asyncHandler(async (req, res, next) => {
  const unreadCount = await models.Notification.count({
    where: { userId: req.user.id, read: false },
  });

  res.status(200).json({ success: true, count: unreadCount });
});

// @desc    Delete a specific notification
// @route   DELETE /api/v1/notifications/:notificationId
// @access  Private (Admin only, but cannot delete their own)
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.role || !req.user.role.includes('admin')) {
    return next(new ErrorResponse('Not authorized to delete notifications', 403));
  }

  const notificationToDelete = await models.Notification.findByPk(req.params.notificationId);

  if (!notificationToDelete) {
    return next(new ErrorResponse(`Notification not found with id of ${req.params.notificationId}`, 404));
  }

  if (notificationToDelete.userId === req.user.id) {
    return next(new ErrorResponse('Admins cannot delete their own notifications', 403));
  }

  const deletedNotificationMessage = notificationToDelete.message;
  const deletedNotificationRecipientId = notificationToDelete.userId; 

  await notificationToDelete.destroy();

  await createNotification(
    req.user.id, 
    'notification_deleted', 
    `Admin ${req.user.username} (ID: ${req.user.id}) deleted a notification. Original message: '${deletedNotificationMessage}'. Recipient User ID: ${deletedNotificationRecipientId}.`,
    'Notification', 
    notificationToDelete.id
  );

  res.status(200).json({ success: true, message: 'Notification deleted' });
});