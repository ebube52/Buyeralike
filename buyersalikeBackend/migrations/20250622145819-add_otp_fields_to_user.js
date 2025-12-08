'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add 'otp' column
    await queryInterface.addColumn('Users', 'otp', {
      type: Sequelize.STRING,
      allowNull: true, // OTP is optional, only set when sent
    });

    // Add 'otpExpires' column
    await queryInterface.addColumn('Users', 'otpExpires', {
      type: Sequelize.DATE,
      allowNull: true, // OTP expiry is optional
    });

    // Add 'isEmailVerified' column
    await queryInterface.addColumn('Users', 'isEmailVerified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false, // Default to false (unverified) for new and existing users
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove 'otp' column
    await queryInterface.removeColumn('Users', 'otp');

    // Remove 'otpExpires' column
    await queryInterface.removeColumn('Users', 'otpExpires');

    // Remove 'isVerified' column
    await queryInterface.removeColumn('Users', 'isEmailVerified');
  }
};