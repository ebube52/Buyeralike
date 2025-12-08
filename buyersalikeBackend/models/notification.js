'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, {as: 'recipient', foreignKey: 'userId'});
    }
  }
  Notification.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: { // The ID of the user who should receive this notification (e.g., admin)
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: { // e.g., 'report', 'new_comment', 'account_activity'
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: { // The actual notification message
      type: DataTypes.TEXT,
      allowNull: false,
    },
    entityType: { // e.g., 'FeedbackComment', 'ForumComment', 'Service'
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityId: { // The ID of the reported entity (comment, service)
      type: DataTypes.UUID,
      allowNull: false,
    },
    read: { // To track if the user has read the notification
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    // Add other relevant fields, e.g., 'fromUserId' if it's a notification from another user
  }, {
    sequelize,
    modelName: 'Notification',
  });
  return Notification;
};