'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KycApplication extends Model {
    static associate(models) {
      // Each KYC application belongs to a User
      KycApplication.belongsTo(models.User, {
        as: 'applicant', // Alias to easily access the user associated with the application
        foreignKey: 'userId',
        onDelete: 'CASCADE', // If a user is deleted, their applications are too
      });
      
      KycApplication.belongsTo(models.User, {
        as: 'reviewer', // Alias for the reviewer (admin user)
        foreignKey: 'reviewedBy', // Maps to the 'reviewedBy' column
        onDelete: 'SET NULL',
      });
    }
  }
  KycApplication.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: { // ID of the user submitting the KYC application
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users', // Name of your User table
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    fullLegalCompanyName: {
      type: DataTypes.STRING,
      allowNull: false, // Should be required for a valid application
    },
    streetNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    streetName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    province: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },    
    serviceType: { // The service the user wants to provide (e.g., 'plumber', 'electrician')
      type: DataTypes.STRING,
      allowNull: false,
    },
    documentUrls: { // Comma-separated URLs of uploaded documents
      type: DataTypes.TEXT, // Use TEXT for potentially long strings of URLs
      allowNull: false,
    },
    status: { // 'pending', 'approved', 'rejected'
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
    },
    adminNotes: { // Optional notes from the admin
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Optional: Add a field for when it was reviewed, and by whom
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewedBy: { // ID of the admin who reviewed it
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users', // Assuming admins are also in the Users table
        key: 'id',
      },
      onUpdate: 'SET NULL', // If admin deleted, set to null
      onDelete: 'SET NULL',
    }
  }, {
    sequelize,
    modelName: 'KycApplication',
  });
  return KycApplication;
};