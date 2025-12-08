'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, DataTypes) {

    await queryInterface.addColumn('Users', 'isPayingMember', {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Default to false, users are not paying members initially
      allowNull: false,    // This field should always have a value
    });

    await queryInterface.addColumn('Users', 'membershipExpires', {
      type: DataTypes.DATE,
      allowNull: true,     // Allow null as not all users will be paying members, or their membership might not have an expiry yet
    });
  },


  async down (queryInterface, DataTypes) {
    await queryInterface.removeColumn('Users', 'membershipExpires');
    await queryInterface.removeColumn('Users', 'isPayingMember');
  }
};
