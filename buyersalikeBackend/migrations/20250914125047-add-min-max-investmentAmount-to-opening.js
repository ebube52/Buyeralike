// database/migrations/YYYYMMDDHHMMSS-add-investment-range-to-openings.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Openings', 'minInvestmentAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('Openings', 'maxInvestmentAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Openings', 'minInvestmentAmount');
    await queryInterface.removeColumn('Openings', 'maxInvestmentAmount');
  },
};