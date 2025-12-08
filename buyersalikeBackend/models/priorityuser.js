'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PriorityUser extends Model {
    static associate(models) {
      PriorityUser.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  PriorityUser.init({
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
    bid: {
      type: DataTypes.STRING,
    },    
  }, {
    sequelize,
    modelName: 'PriorityUser',
  });
  return PriorityUser;
};