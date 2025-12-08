'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('Users', 'plan', {
        type: Sequelize.STRING,
        defaultValue: 'basic'
    }); 
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('Users', 'plan'); 
  }
};
