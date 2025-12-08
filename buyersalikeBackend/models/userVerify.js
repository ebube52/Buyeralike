'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserVerify extends Model {
    static associate(models) {
      UserVerify.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  UserVerify.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    verificationFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    successful: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    idCard: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    selfie: {
      type: DataTypes.STRING,
      allowNull: false,
    },    
    verificationStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'requested', 'approved', 'suspended']],
      },
    },
    channel: {
      type: DataTypes.STRING,
      allowNull: true,
    },    
  }, {
    sequelize,
    modelName: 'UserVerify',
  });
  return UserVerify;
};
