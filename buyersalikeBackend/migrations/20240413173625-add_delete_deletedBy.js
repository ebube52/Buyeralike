'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'deleted', {
      type: Sequelize.BOOLEAN
    });    
    await queryInterface.addColumn('Users', 'deleteTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });   
    await queryInterface.addColumn('Users', 'deletedBy', {
      type: Sequelize.UUID,
    }); 
    await queryInterface.addColumn('Services', 'deleted', {
      type: Sequelize.BOOLEAN
    });    
    await queryInterface.addColumn('Services', 'deleteTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    await queryInterface.addColumn('Services', 'deletedBy', {
      type: Sequelize.UUID,
    }); 
    await queryInterface.addColumn('Groups', 'deleted', {
      type: Sequelize.BOOLEAN
    });
    await queryInterface.addColumn('Groups', 'deleteTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    await queryInterface.addColumn('Groups', 'deletedBy', {
      type: Sequelize.UUID,
    }); 
    await queryInterface.addColumn('GroupComments', 'deleted', {
      type: Sequelize.BOOLEAN
    });    
    await queryInterface.addColumn('GroupComments', 'deleteTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });        
    await queryInterface.addColumn('GroupComments', 'deletedBy', {
      type: Sequelize.UUID,
    }); 
    await queryInterface.addColumn('ForumComments', 'deleted', {
      type: Sequelize.BOOLEAN
    });    
    await queryInterface.addColumn('ForumComments', 'deleteTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });        
    await queryInterface.addColumn('ForumComments', 'deletedBy', {
      type: Sequelize.UUID,
    }); 
    await queryInterface.addColumn('FeedbackComments', 'deleted', {
      type: Sequelize.BOOLEAN
    });    
    await queryInterface.addColumn('FeedbackComments', 'deleteTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });  
    await queryInterface.addColumn('FeedbackComments', 'deletedBy', {
      type: Sequelize.UUID,
    }); 
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'deleted');
    await queryInterface.removeColumn('Users', 'deleteTime');   
    await queryInterface.removeColumn('Users', 'deletedBy'); 
    await queryInterface.removeColumn('Services', 'deleted');
    await queryInterface.removeColumn('Services', 'deleteTime');
    await queryInterface.removeColumn('Services', 'deletedBy'); 
    await queryInterface.removeColumn('Groups', 'deleted');
    await queryInterface.removeColumn('Groups', 'deleteTime');
    await queryInterface.removeColumn('Groups', 'deletedBy'); 
    await queryInterface.removeColumn('GroupComments', 'deleted');  
    await queryInterface.removeColumn('GroupComments', 'deleteTime');        
    await queryInterface.removeColumn('GroupComments', 'deletedBy'); 
    await queryInterface.removeColumn('ForumComments', 'deleted');  
    await queryInterface.removeColumn('ForumComments', 'deleteTime');        
    await queryInterface.removeColumn('ForumComments', 'deletedBy');
    await queryInterface.removeColumn('FeedbackComments', 'deleted');  
    await queryInterface.removeColumn('FeedbackComments', 'deleteTime');  
    await queryInterface.removeColumn('FeedbackComments', 'deletedBy'); 
  }
};
