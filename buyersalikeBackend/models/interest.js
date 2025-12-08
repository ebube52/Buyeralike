'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Interest extends Model {
    static associate(models) {
      Interest.belongsToMany(models.User, { through: 'UserInterests' });
    }
  }
  Interest.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [0, 50],       
      },      
    },
    image: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500],       
      },       
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    statusMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 200],       
      },          
    },
  }, {
    sequelize,
    modelName: 'Interest',
  });
  return Interest;
};