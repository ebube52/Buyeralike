'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Opening extends Model {
    static associate(models) { 
      Opening.belongsTo(models.User, { foreignKey: 'userId', as: 'creator' });
      Opening.belongsTo(models.OpeningCategory, { foreignKey: 'openingCategoryId', as: 'openingCategory' });    
      Opening.hasMany(models.Partnership, { foreignKey: 'openingId', as: 'Partnerships' });
      Opening.hasMany(models.PartnershipGroup, { foreignKey: 'openingId', as: 'PartnershipGroups' });        
    }
  }
  Opening.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: { 
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [0, 100], 
      },
    },
    slug: { 
      type: DataTypes.STRING,
      unique: true,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [0, 1000], 
      },
    },
    sourceLink: { 
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true, 
      }
    },
    minInvestmentAmount: {
      type: DataTypes.DECIMAL(25, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    maxInvestmentAmount: {
      type: DataTypes.DECIMAL(25, 2),
      allowNull: true,
      validate: {
        min: 0,
        isGreaterThanMin(value) {
          if (this.minInvestmentAmount && value && parseFloat(value) < parseFloat(this.minInvestmentAmount)) {
            throw new Error('Maximum investment amount cannot be less than the minimum.');
          }
        }
      },
    },  
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'closed', 'verified', 'unverified'),
      defaultValue: 'pending'
    },
    statusMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 200],
      },
    },
    userId: { 
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users', 
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'Opening',
    hooks: {
      beforeValidate: async (opening, options) => {
        if (opening.title) {
          opening.slug = opening.title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') 
            .replace(/^-+|-+$/g, ''); 
        }
      }
    }
  });
  return Opening;
};