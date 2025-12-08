'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ForumComments', 'forumCategoryId', {
      type: Sequelize.UUID,
      allowNull: true, 
      references: {
        model: 'ForumCategories', 
        key: 'id',                
      },
      onUpdate: 'CASCADE', 
      onDelete: 'SET NULL', 
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ForumComments', 'forumCategoryId');
  }
};