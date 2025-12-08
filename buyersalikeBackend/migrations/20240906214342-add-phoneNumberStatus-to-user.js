'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Users', 'phoneNumberStatus', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Private',
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Users', 'phoneNumberStatus');
  }
};
