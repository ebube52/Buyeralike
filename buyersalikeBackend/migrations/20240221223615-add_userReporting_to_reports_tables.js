'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('ForumCommentReports', 'reportBy', {
        type: Sequelize.UUID,
        allowNull: false, 
      }
    ); 
    await queryInterface.addColumn('FeedbackCommentReports', 'reportBy', {
        type: Sequelize.UUID,
        allowNull: false, 
      }
    ); 
    await queryInterface.addColumn('GroupCommentReports', 'reportBy', {
        type: Sequelize.UUID,
        allowNull: false, 
      }
    ); 
    await queryInterface.addColumn('ServiceReports', 'reportBy', {
        type: Sequelize.UUID,
        allowNull: false, 
      }
    );     
    await queryInterface.changeColumn('ForumCommentReports', 'commentId', { 
      type: Sequelize.UUID,
      allowNull: false, 
    });    
    await queryInterface.changeColumn('ForumCommentReports', 'commentUserId', { 
      type: Sequelize.UUID,
      allowNull: false, 
    }); 
    await queryInterface.changeColumn('FeedbackCommentReports', 'commentId', { 
      type: Sequelize.UUID,
      allowNull: false, 
    });   
    await queryInterface.changeColumn('FeedbackCommentReports', 'commentUserId', { 
      type: Sequelize.UUID,
      allowNull: false, 
    });    
    await queryInterface.changeColumn('FeedbackCommentReports', 'userId', { 
      type: Sequelize.UUID,
      allowNull: false, 
    });          
    await queryInterface.changeColumn('GroupCommentReports', 'commentId', { 
      type: Sequelize.UUID,
      allowNull: false, 
    });   
    await queryInterface.changeColumn('GroupCommentReports', 'commentUserId', { 
      type: Sequelize.UUID,
      allowNull: false, 
    });       
    await queryInterface.changeColumn('GroupCommentReports', 'groupId', { 
      type: Sequelize.UUID,
      allowNull: false, 
    });        
    await queryInterface.changeColumn('ServiceReports', 'serviceId', { 
      type: Sequelize.UUID,
      allowNull: false, 
    });       
    await queryInterface.changeColumn('ServiceReports', 'userId', { 
      type: Sequelize.UUID,
      allowNull: false, 
    });                 
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('ForumCommentReports', 'reportBy'); 
    await queryInterface.removeColumn('FeedbackCommentReports', 'reportBy'); 
    await queryInterface.removeColumn('GroupCommentReports', 'reportBy'); 
    await queryInterface.removeColumn('ServiceReports', 'reportBy');    
    await queryInterface.changeColumn('ForumCommentReports', 'commentId');    
    await queryInterface.changeColumn('ForumCommentReports', 'commentUserId'); 
    await queryInterface.changeColumn('FeedbackCommentReports', 'commentId');   
    await queryInterface.changeColumn('FeedbackCommentReports', 'commentUserId');    
    await queryInterface.changeColumn('FeedbackCommentReports', 'userId');          
    await queryInterface.changeColumn('GroupCommentReports', 'commentId');   
    await queryInterface.changeColumn('GroupCommentReports', 'commentUserId');       
    await queryInterface.changeColumn('GroupCommentReports', 'groupId');        
    await queryInterface.changeColumn('ServiceReports', 'serviceId');       
    await queryInterface.changeColumn('ServiceReports', 'userId');     
  }
};
