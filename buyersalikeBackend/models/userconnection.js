'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserConnection extends Model {
    static associate(models) {
      UserConnection.belongsTo(models.User, { foreignKey: 'userId1', as: 'User1' });
      UserConnection.belongsTo(models.User, { foreignKey: 'userId2', as: 'User2' });
    }
  }
  UserConnection.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId1: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId2: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'UserConnection',
    indexes: [
      {
        unique: true,
        fields: ['userId1', 'userId2']
      }
    ]
  });
  return UserConnection;
};
