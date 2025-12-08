'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'suspensionTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    await queryInterface.addColumn('Users', 'lockedTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    await queryInterface.addColumn('Users', 'planTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    await queryInterface.addColumn('Users', 'verifiedTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    await queryInterface.addColumn('Users', 'roleTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    await queryInterface.addColumn('Users', 'suspendedBy', {
      type: Sequelize.UUID,
    });    
    await queryInterface.addColumn('Users', 'lockedBy', {
      type: Sequelize.UUID,
    }); 
    await queryInterface.addColumn('Services', 'lockedTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    await queryInterface.addColumn('Services', 'lockedBy', {
      type: Sequelize.UUID,
    }); 
    await queryInterface.addColumn('Groups', 'locked', {
      type: Sequelize.BOOLEAN
    });
    await queryInterface.addColumn('Groups', 'lockedTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    await queryInterface.addColumn('Groups', 'lockedBy', {
      type: Sequelize.UUID,
    }); 
    await queryInterface.addColumn('GroupComments', 'lockedTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });        
    await queryInterface.addColumn('GroupComments', 'lockedBy', {
      type: Sequelize.UUID,
    }); 
    await queryInterface.addColumn('ForumComments', 'lockedTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });        
    await queryInterface.addColumn('ForumComments', 'lockedBy', {
      type: Sequelize.UUID,
    }); 
    await queryInterface.addColumn('FeedbackComments', 'lockedTime', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });  
    await queryInterface.addColumn('FeedbackComments', 'lockedBy', {
      type: Sequelize.UUID,
    }); 
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'suspensionTime');
    await queryInterface.removeColumn('Users', 'lockedTime');
    await queryInterface.removeColumn('Users', 'planTime');
    await queryInterface.removeColumn('Users', 'verifiedTime');
    await queryInterface.removeColumn('Users', 'roleTime');
    await queryInterface.removeColumn('Users', 'suspendedBy');    
    await queryInterface.removeColumn('Users', 'lockedBy'); 
    await queryInterface.removeColumn('Services', 'lockedTime');
    await queryInterface.removeColumn('Services', 'lockedBy'); 
    await queryInterface.removeColumn('Groups', 'locked');
    await queryInterface.removeColumn('Groups', 'lockedTime');
    await queryInterface.removeColumn('Groups', 'lockedBy'); 
    await queryInterface.removeColumn('GroupComments', 'lockedTime');        
    await queryInterface.removeColumn('GroupComments', 'lockedBy'); 
    await queryInterface.removeColumn('ForumComments', 'lockedTime');        
    await queryInterface.removeColumn('ForumComments', 'lockedBy'); 
    await queryInterface.removeColumn('FeedbackComments', 'lockedTime');  
    await queryInterface.removeColumn('FeedbackComments', 'lockedBy'); 
  }
};
