'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('UserPlans', 'planDuration', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.addColumn('UserPlans', 'paymentDate', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('UserPlans', 'planDuration');
    await queryInterface.removeColumn('UserPlans', 'paymentDate');
  }
};
