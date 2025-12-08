'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ForumCommentReports', {
      id: {
        type: Sequelize.UUID,
        defaultValue: () => uuidv4(),         
        primaryKey: true,       
        allowNull: false,        
      }, 
      commentId: {
        type: Sequelize.STRING,
        allowNull: false,   
      },
      commentUserId: {
        type: Sequelize.STRING,
        allowNull: false,   
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,   
      },
      reportReasons: {
        type: Sequelize.STRING,
        allowNull: false,   
      },
      report: {
        type: Sequelize.TEXT('medium'),
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
    await queryInterface.dropTable('ForumCommentReports');
  }
};