'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'firstName', {
      type: Sequelize.STRING,
      allowNull: true, // Set to false if you want this field to be required
      validate: {
        len: [0, 50],  // You can adjust the length
      }
    });

    await queryInterface.addColumn('Users', 'lastName', {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        len: [0, 50],
      }
    });

    await queryInterface.addColumn('Users', 'additionalName', {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        len: [0, 50],
      }
    });

    await queryInterface.addColumn('Users', 'birthDay', {
      type: Sequelize.DATEONLY, // Use DATEONLY for just the date part (no time)
      allowNull: true, // Set to false if you want it to be required
    });

    await queryInterface.addColumn('Users', 'occupation', {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        len: [0, 100], // Adjust length if needed
      }
    });

    await queryInterface.addColumn('Users', 'maritalStatus', {
      type: Sequelize.STRING,
      allowNull: true, // Adjust if you want to enforce a value
      validate: {
        isIn: [['single', 'married', 'divorced', 'widowed']], // Example validation, customize as needed
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'firstName');
    await queryInterface.removeColumn('Users', 'lastName');
    await queryInterface.removeColumn('Users', 'additionalName');
    await queryInterface.removeColumn('Users', 'birthDay');
    await queryInterface.removeColumn('Users', 'occupation');
    await queryInterface.removeColumn('Users', 'maritalStatus');
  }
};
