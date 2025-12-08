'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Openings', 'status', {
      type: Sequelize.STRING,
      allowNull: true, 
    });

    await queryInterface.changeColumn('Openings', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected', 'closed', 'verified', 'unverified'),
      defaultValue: 'pending', 
      allowNull: false, 
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Openings', 'status', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn('Openings', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected', 'closed'),
      defaultValue: 'pending',
      allowNull: false,
    });
  }
};