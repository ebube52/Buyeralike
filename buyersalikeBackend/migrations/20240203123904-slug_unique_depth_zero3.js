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
    await queryInterface.removeConstraint('GroupComments', 'slug');
    await queryInterface.removeConstraint('ForumComments', 'slug');    
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('Users');
     */
    await queryInterface.removeConstraint('GroupComments', 'slug');
    await queryInterface.removeConstraint('ForumComments', 'slug');     
  }
};
