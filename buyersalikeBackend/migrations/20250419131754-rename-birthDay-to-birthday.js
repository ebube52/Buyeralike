'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('Users', 'birthDay', 'birthday');
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('Users', 'birthday', 'birthDay');
  }
};
