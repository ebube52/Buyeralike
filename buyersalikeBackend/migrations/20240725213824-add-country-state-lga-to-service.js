'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Services', 'country', {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: [0, 20]
      }
    });
    await queryInterface.addColumn('Services', 'state', {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: [0, 20]
      }
    });
    await queryInterface.addColumn('Services', 'lga', {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: [0, 50]
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Services', 'country');
    await queryInterface.removeColumn('Services', 'state');
    await queryInterface.removeColumn('Services', 'lga');
  }
};
