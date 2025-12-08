'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Connection extends Model {
    static associate(models) {
      // You can set associations if needed, e.g.
      Connection.belongsTo(models.User, { as: 'requester', foreignKey: 'requesterId' });
      Connection.belongsTo(models.User, { as: 'receiver', foreignKey: 'receiverId' });
    }
  }

  Connection.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    requesterId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    receiverId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'connected', 'rejected', 'disconnected'),
      defaultValue: 'pending',
    },
    connectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    disconnectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Connection',
  });

  return Connection;
};
