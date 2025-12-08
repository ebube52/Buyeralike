'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ForumComments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: () => uuidv4(),         
        primaryKey: true,       
        allowNull: false,        
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      title: {
        type: Sequelize.STRING,
      },
      text: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      image: {
        type: Sequelize.STRING,
      },
      parentId: {
        type: Sequelize.UUID,
      },
      repliesSize: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      depth: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fp: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      commentUserId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      likes: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      dislikes: {
        type: Sequelize.INTEGER,
        allowNull: false,
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
    await queryInterface.dropTable('ForumComments');
  }
};