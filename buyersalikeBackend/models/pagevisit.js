'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PageVisit extends Model {
    static associate(models) {
      // Define any associations here
      PageVisit.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  PageVisit.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    pageUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    visitedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userIdentifier: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'PageVisit',
    timestamps: false,
  });

  return PageVisit;
};