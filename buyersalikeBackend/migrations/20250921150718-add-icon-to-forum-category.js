'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('ForumCategories', 'icon', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'MessageCircle',
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('ForumCategories', 'icon');
  }
};