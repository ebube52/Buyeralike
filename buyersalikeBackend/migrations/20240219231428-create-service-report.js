'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ServiceReports', {
      id: {
        type: Sequelize.UUID,
        defaultValue: () => uuidv4(),         
        primaryKey: true,       
        allowNull: false,        
      }, 
      serviceId: {
        type: Sequelize.STRING
      },
      userId: {
        type: Sequelize.STRING
      },
      reportReasons: {
        type: Sequelize.STRING
      },
      report: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ServiceReports');
  }
};