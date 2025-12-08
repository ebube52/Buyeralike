'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PriorityForumComments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,            
        allowNull: false  
      },
      commentId: {
        type: Sequelize.UUID,
        allowNull: false
      },
      bid: {
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
    await queryInterface.dropTable('PriorityForumComments');
  }
};