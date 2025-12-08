'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('UserVerifies', 'idCardUrl', 'idCard');
    await queryInterface.addColumn('UserVerifies', 'selfie', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn('UserVerifies', 'idCardUrl', 'idCard');
    await queryInterface.removeColumn('UserVerifies', 'selfie');
  }
};
