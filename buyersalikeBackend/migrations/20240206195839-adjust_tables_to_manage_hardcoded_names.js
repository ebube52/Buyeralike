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
    await queryInterface.removeColumn('GroupComments', 'groupName');    
    await queryInterface.removeColumn('Groups', 'creatorUserName');  
    await queryInterface.removeColumn('Services', 'username');    
    await queryInterface.addColumn('Users', 'usernames', {
        type: Sequelize.STRING
      }
    );
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('Users');
     */
    await queryInterface.addColumn('GroupComments', 'groupName', {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [0, 20],
        },        
      }
    );
    await queryInterface.addColumn('Groups', 'creatorUserName', {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [5, 15]       
        },      
      }
    );
    await queryInterface.addColumn('Services', 'username', {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [5, 15]       
        },        
      }
    );
    await queryInterface.removeColumn('Users', 'usernames');    
  }
};
