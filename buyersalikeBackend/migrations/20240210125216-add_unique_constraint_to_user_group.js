'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('Users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addConstraint('UserGroups', {
      type: 'unique',
      fields: ['userId', 'groupId'],
      name: 'unique_user_group_combination'
    });    
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('Users');
     */
    await queryInterface.removeConstraint('UserGroups', 'unique_user_group_combination');
  }
};
