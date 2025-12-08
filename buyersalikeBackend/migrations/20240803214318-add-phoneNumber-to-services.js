'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Services', 'phoneNumber', {
      type: Sequelize.STRING,
      validate: {
        is: /^\d{0,14}$/,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Services', 'phoneNumber');
  },
};
