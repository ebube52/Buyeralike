const models = require('../models'); // Import your Sequelize models

/**
 * Helper function to create a new notification.
 * @param {string} userId - The ID of the user who should receive this notification.
 * @param {string} type - The type of notification (e.g., 'report', 'new_comment').
 * @param {string} message - The actual notification message.
 * @param {string} entityType - The type of the entity related to the notification (e.g., 'FeedbackComment').
 * @param {string} entityId - The ID of the entity related to the notification.
 * @returns {Promise<object>} The created notification object.
 */
const createNotification = async (userId, type, message, entityType, entityId) => {
  try {
    const notification = await models.Notification.create({
      userId,
      type,
      message,
      entityType,
      entityId,
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Failed to create notification');
  }
};

module.exports = {
  createNotification,
};