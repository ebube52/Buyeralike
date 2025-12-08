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
    await queryInterface.changeColumn('Users', 'id', { 
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,               
      allowNull: false,
    });
    await queryInterface.changeColumn('Groups', 'id', { 
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,              
      allowNull: false,
    });
    await queryInterface.changeColumn('Services', 'id', { 
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,            
      allowNull: false,
     });
    await queryInterface.changeColumn('GroupComments', 'id', { 
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,           
      allowNull: false,
    });
    await queryInterface.changeColumn('ForumComments', 'id', { 
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,           
      allowNull: false,
    });
    await queryInterface.changeColumn('FeedbackComments', 'id', { 
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,             
      allowNull: false,
    });
    await queryInterface.changeColumn('GroupCommentUserReactions', 'id', { 
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,            
      allowNull: false,
    });
    await queryInterface.changeColumn('ForumCommentUserReactions', 'id', { 
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,         
      allowNull: false,
    });
    await queryInterface.changeColumn('FeedbackCommentUserReactions', 'id', { 
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,          
      allowNull: false,
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('Users');
     */
    await queryInterface.changeColumn('Users', 'id');
    await queryInterface.changeColumn('Groups', 'id');
    await queryInterface.changeColumn('Services', 'id');
    await queryInterface.changeColumn('GroupComments', 'id');
    await queryInterface.changeColumn('ForumComments', 'id');
    await queryInterface.changeColumn('FeedbackComments', 'id');
    await queryInterface.changeColumn('GroupCommentUserReactions', 'id');
    await queryInterface.changeColumn('ForumCommentUserReactions', 'id');
    await queryInterface.changeColumn('FeedbackCommentUserReactions', 'id')
  }
};
