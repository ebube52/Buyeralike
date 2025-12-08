// Migration: YYYYMMDDHHMMSS-add-address-to-kycapplication.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('KycApplications', 'fullLegalCompanyName', {
      type: Sequelize.STRING,
      allowNull: true, // Making them nullable temporarily during migration, but should be treated as required in controller/frontend
    });
    await queryInterface.addColumn('KycApplications', 'streetNumber', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('KycApplications', 'streetName', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('KycApplications', 'city', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('KycApplications', 'province', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('KycApplications', 'postalCode', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('KycApplications', 'country', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('KycApplications', 'fullLegalCompanyName');
    await queryInterface.removeColumn('KycApplications', 'streetNumber');
    await queryInterface.removeColumn('KycApplications', 'streetName');
    await queryInterface.removeColumn('KycApplications', 'city');
    await queryInterface.removeColumn('KycApplications', 'province');
    await queryInterface.removeColumn('KycApplications', 'postalCode');
    await queryInterface.removeColumn('KycApplications', 'country');
  }
};