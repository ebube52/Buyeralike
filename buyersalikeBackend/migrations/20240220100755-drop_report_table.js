'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('Users', { id: Sequelize.INTEGER });
     */
    await queryInterface.dropTable('reports');
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('Users');
     */
    await queryInterface.createTable('Reports', {
      id: {
        type: Sequelize.UUID,
        defaultValue: () => uuidv4(),         
        primaryKey: true,       
        allowNull: false,        
      },      
      reportType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      reportId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      reportReasons: {
        type: Sequelize.STRING,
        allowNull: false,
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
  }
};
