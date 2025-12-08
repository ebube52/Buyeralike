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
    await queryInterface.changeColumn('GroupComments', 'title', { 
      type: Sequelize.STRING,
      validate: {
        len: [0, 100],
      },
    });      
    await queryInterface.changeColumn('GroupComments', 'text', { 
      type: Sequelize.TEXT('medium'),
      allowNull: false,
      validate: {
        len: [0, 1000],
      },
    });     
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('Users');
     */
    await queryInterface.changeColumn('GroupComments', 'title');      
    await queryInterface.changeColumn('GroupComments', 'text');      
  }
};
