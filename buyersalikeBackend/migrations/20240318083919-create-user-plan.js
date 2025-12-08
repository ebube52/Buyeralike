'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserPlans', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,            
        allowNull: false  
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false
      },
      plan: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {        
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UserPlans');
  }
};