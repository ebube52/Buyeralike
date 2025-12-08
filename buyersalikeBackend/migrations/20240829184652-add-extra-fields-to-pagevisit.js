'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('PageVisits', 'ipAddress', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.addColumn('PageVisits', 'userAgent', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.addColumn('PageVisits', 'userIdentifier', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('PageVisits', 'ipAddress');
    await queryInterface.removeColumn('PageVisits', 'userAgent');
    await queryInterface.removeColumn('PageVisits', 'userIdentifier');
  }
};
