const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth'); // Assuming you have an auth middleware
const {
  getNotifications,          // Admin-only function
  getNotificationsByUserId,  // User-specific function
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationsCount
} = require('../controllers/notification');

router.route('/all').get(protect, authorize('adminL5'), getNotifications);
router.route('/user').get(protect, getNotificationsByUserId); 
router.get('/unread-count', protect, getUnreadNotificationsCount); // Get count of unread notifications
router.put('/:notificationId/read', protect, markNotificationAsRead); // Mark a specific notification as read
router.put('/mark-all-read', protect, markAllNotificationsAsRead); // Mark all notifications as read
router.delete('/:notificationId', protect, deleteNotification); // Delete a specific notification

module.exports = router;