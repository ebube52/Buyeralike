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
    await queryInterface.changeColumn('Users', 'biodata', { 
      type: Sequelize.TEXT('medium'),
      validate: {
        len: [0, 300],
      },
    });  
    await queryInterface.changeColumn('Services', 'serviceDescription', { 
      type: Sequelize.TEXT('medium'),
      allowNull: false,
      validate: {
        len: [0, 300],
      },
    });  
    await queryInterface.changeColumn('Services', 'chargeDuration', { 
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: [0, 20],
      },
    });      
    await queryInterface.changeColumn('FeedbackComments', 'text', { 
      type: Sequelize.TEXT('medium'),
      allowNull: false,
      validate: {
        len: [0, 1000],
      },
    });  
    await queryInterface.changeColumn('Groups', 'name', { 
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [0, 20],
      },
    });      
    await queryInterface.changeColumn('Groups', 'about', { 
      type: Sequelize.TEXT('medium'),
      validate: {
        len: {
          args: [0, 1000],
          msg: 'About data exceeds 1000 characters!',
        },
      },
    });  
    await queryInterface.changeColumn('ForumComments', 'title', { 
      type: Sequelize.STRING,
      validate: {
        len: [0, 100],
      },
    });      
    await queryInterface.changeColumn('ForumComments', 'text', { 
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
    await queryInterface.changeColumn('Users', 'biodata');  
    await queryInterface.changeColumn('Services', 'serviceDescription');  
    await queryInterface.changeColumn('Services', 'chargeDuration');      
    await queryInterface.changeColumn('FeedbackComments', 'text');  
    await queryInterface.changeColumn('Groups', 'name');      
    await queryInterface.changeColumn('Groups', 'about');  
    await queryInterface.changeColumn('ForumComments', 'title');      
    await queryInterface.changeColumn('ForumComments', 'text');  
  }
};