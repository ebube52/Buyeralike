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
    await queryInterface.addColumn('Users', 'suspended', {
        type: Sequelize.BOOLEAN
      }
    ); 
    await queryInterface.addColumn('Users', 'suspensionDuration', {
        type: Sequelize.INTEGER
      }
    ); 
    await queryInterface.addColumn('Users', 'locked', {
        type: Sequelize.BOOLEAN
      }
    );
    await queryInterface.addColumn('ForumComments', 'viewCounts', {
        type: Sequelize.INTEGER
      }
    );       
    await queryInterface.addColumn('ForumComments', 'reported', {
        type: Sequelize.BOOLEAN
      }
    );
    await queryInterface.addColumn('ForumComments', 'numberOfReports', {
        type: Sequelize.INTEGER
      }
    );    
    await queryInterface.addColumn('ForumComments', 'locked', {
        type: Sequelize.BOOLEAN
      }    
    );   
    await queryInterface.addColumn('FeedbackComments', 'viewCounts', {
        type: Sequelize.INTEGER
      }
    );   
    await queryInterface.addColumn('FeedbackComments', 'reported', {
        type: Sequelize.BOOLEAN
      }
    );
    await queryInterface.addColumn('FeedbackComments', 'numberOfReports', {
        type: Sequelize.INTEGER
      }
    );    
    await queryInterface.addColumn('FeedbackComments', 'locked', {
        type: Sequelize.BOOLEAN
      }    
    );       
    await queryInterface.addColumn('GroupComments', 'viewCounts', {
        type: Sequelize.INTEGER
      }
    );       
    await queryInterface.addColumn('GroupComments', 'reported', {
        type: Sequelize.BOOLEAN
      }
    );
    await queryInterface.addColumn('GroupComments', 'numberOfReports', {
        type: Sequelize.INTEGER
      }
    );    
    await queryInterface.addColumn('GroupComments', 'locked', {
        type: Sequelize.BOOLEAN
      }    
    );
    await queryInterface.addColumn('Services', 'viewCounts', {
        type: Sequelize.INTEGER
      }
    );       
    await queryInterface.addColumn('Services', 'reported', {
        type: Sequelize.BOOLEAN
      }
    );
    await queryInterface.addColumn('Services', 'numberOfReports', {
        type: Sequelize.INTEGER
      }
    );    
    await queryInterface.addColumn('Services', 'locked', {
        type: Sequelize.BOOLEAN
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
    await queryInterface.removeColumn('Users', 'suspended'); 
    await queryInterface.removeColumn('Users', 'suspensionDuration'); 
    await queryInterface.removeColumn('Users', 'locked'); 
    await queryInterface.removeColumn('ForumComments', 'viewCounts');       
    await queryInterface.removeColumn('ForumComments', 'reported');
    await queryInterface.removeColumn('ForumComments', 'numberOfReports');    
    await queryInterface.removeColumn('ForumComments', 'locked');   
    await queryInterface.removeColumn('FeedbackComments', 'viewCounts');
    await queryInterface.removeColumn('FeedbackComments', 'reported');
    await queryInterface.removeColumn('FeedbackComments', 'numberOfReports');    
    await queryInterface.removeColumn('FeedbackComments', 'locked');       
    await queryInterface.removeColumn('GroupComments', 'viewCounts');       
    await queryInterface.removeColumn('GroupComments', 'reported');
    await queryInterface.removeColumn('GroupComments', 'numberOfReports');    
    await queryInterface.removeColumn('GroupComments', 'locked');
    await queryInterface.removeColumn('Services', 'viewCounts');       
    await queryInterface.removeColumn('Services', 'reported');
    await queryInterface.removeColumn('Services', 'numberOfReports');    
    await queryInterface.removeColumn('Services', 'locked');     
  }
};
