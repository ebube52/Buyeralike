'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('UserPlans', 'reference', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn('UserPlans', 'transactionStatus', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('UserPlans', 'reference');
    await queryInterface.removeColumn('UserPlans', 'transactionStatus');
  }
};
