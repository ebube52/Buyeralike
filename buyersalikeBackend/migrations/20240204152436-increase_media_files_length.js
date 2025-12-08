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
    await queryInterface.changeColumn('Services', 'name', { 
      type: Sequelize.TEXT('medium'),
      allowNull: false,
      validate: {
        len: [0, 2000],
      },
    });  
    await queryInterface.changeColumn('Services', 'type', { 
      type: Sequelize.TEXT('medium'),
      allowNull: false,
      validate: {
        len: [0, 2000],
      },
    });  
    await queryInterface.changeColumn('Services', 'url', { 
      type: Sequelize.TEXT('medium'),
      allowNull: false,
      validate: {
        len: [0, 2000],
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
    await queryInterface.changeColumn('Services', 'name');  
    await queryInterface.changeColumn('Services', 'type');  
    await queryInterface.changeColumn('Services', 'url');     
  }
};
