'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserPlan extends Model {
    static associate(models) {
      UserPlan.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  UserPlan.init({
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
    plan: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [0, 10]       
      },       
    },
    planDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false
    },
    successful: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    channel: {
      type: DataTypes.STRING
    },    
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    amountPaid: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    }    
  }, {
    sequelize,
    modelName: 'UserPlan',
  });
  return UserPlan;
};