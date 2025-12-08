'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove the visitCount column
    await queryInterface.removeColumn('PageVisits', 'visitCount');

    // Add the visitedAt column
    await queryInterface.addColumn('PageVisits', 'visitedAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Add back the visitCount column
    await queryInterface.addColumn('PageVisits', 'visitCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    // Remove the visitedAt column
    await queryInterface.removeColumn('PageVisits', 'visitedAt');
  },
};
