// models/payment.js
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      // Define associations here if needed, e.g., a payment belongs to a user
      Payment.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'payer',
      });
      // A payment could also be associated with a specific service or order
      // Payment.belongsTo(models.Service, {
      //   foreignKey: 'serviceId',
      //   as: 'paidForService',
      // });
    }
  }
  Payment.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: { // Who made the payment
      type: DataTypes.UUID,
      allowNull: false,
    },
    amount: { // Amount in cents (Stripe's preferred unit)
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'CAD', // Or 'ngn' for Nigerian Naira
    },
    description: { // What was paid for
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: { // e.g., 'pending', 'succeeded', 'failed', 'refunded'
      type: DataTypes.ENUM('pending', 'succeeded', 'failed', 'refunded', 'processing'),
      defaultValue: 'pending',
      allowNull: false,
    },
    stripePaymentId: { // Stripe's Checkout Session ID or Payment Intent ID
      type: DataTypes.STRING,
      allowNull: true,
      unique: true, // Should be unique for successful payments
    },
    // You might want to store more details from Stripe if needed
    // customerId: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // },
    // paymentMethodType: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // }
  }, {
    sequelize,
    modelName: 'Payment',
    tableName: 'Payments', // Ensure table name is plural
  });
  return Payment;
};