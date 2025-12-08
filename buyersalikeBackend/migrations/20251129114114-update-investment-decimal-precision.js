'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Increase precision for minInvestmentAmount
    await queryInterface.changeColumn('Openings', 'minInvestmentAmount', {
      type: Sequelize.DECIMAL(25, 2),
      allowNull: true,
    });

    // Increase precision for maxInvestmentAmount
    await queryInterface.changeColumn('Openings', 'maxInvestmentAmount', {
      type: Sequelize.DECIMAL(25, 2),
      allowNull: true,
      validate: {
        min: 0,
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to DECIMAL(15, 2)
    await queryInterface.changeColumn('Openings', 'minInvestmentAmount', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
    });

    await queryInterface.changeColumn('Openings', 'maxInvestmentAmount', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        min: 0,
      }
    });
  }
};
