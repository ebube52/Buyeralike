'use strict';
// No need to import uuid here, Sequelize.UUIDV4 handles it
// const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false, // userId must always be present
        references: {
          model: 'Users', // Name of your User model's table
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT', // <--- CHANGE THIS LINE from 'SET NULL' to 'RESTRICT'
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'usd',
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'succeeded', 'failed', 'refunded', 'processing'),
        defaultValue: 'pending',
        allowNull: false,
      },
      stripePaymentId: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Payments');
  }
};