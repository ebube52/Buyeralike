'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('UserPlans', 'transactionStatus', 'successful');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn('UserPlans', 'successful', 'transactionStatus');
  }
};
