// backend/migrations/YYYYMMDDHHmmss-create-engagement.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Engagements', {
      id: {
        allowNull: false,
        autoIncrement: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      engagementType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      engagementTypeId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      engagementDate: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Engagements');
  }
};
