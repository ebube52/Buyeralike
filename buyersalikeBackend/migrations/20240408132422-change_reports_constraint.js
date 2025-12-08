'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('FeedbackCommentReports', 'unique_feedback_comment_report_combination');
    await queryInterface.removeConstraint('ForumCommentReports', 'unique_forum_comment_report_combination');
    await queryInterface.removeConstraint('GroupCommentReports', 'unique_group_comment_report_combination');
    await queryInterface.removeConstraint('ServiceReports', 'unique_service_report_combination');

    await queryInterface.addConstraint('FeedbackCommentReports', {
      type: 'unique',
      fields: ['commentId', 'reportBy'],
      name: 'unique_feedback_comment_report_combination'
    }); 
    await queryInterface.addConstraint('ForumCommentReports', {
      type: 'unique',
      fields: ['commentId', 'reportBy'],
      name: 'unique_forum_comment_report_combination'
    }); 
    await queryInterface.addConstraint('GroupCommentReports', {
      type: 'unique',
      fields: ['commentId', 'reportBy'],
      name: 'unique_group_comment_report_combination'
    }); 
    await queryInterface.addConstraint('ServiceReports', {
      type: 'unique',
      fields: ['serviceId', 'reportBy'],
      name: 'unique_service_report_combination'
    });                  
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('FeedbackCommentReports', 'unique_feedback_comment_report_combination');
    await queryInterface.removeConstraint('ForumCommentReports', 'unique_forum_comment_report_combination');
    await queryInterface.removeConstraint('GroupCommentReports', 'unique_group_comment_report_combination');
    await queryInterface.removeConstraint('ServiceReports', 'unique_service_report_combination');

    await queryInterface.addConstraint('FeedbackCommentReports', {
      type: 'unique',
      fields: ['commentId', 'commentUserId'],
      name: 'unique_feedback_comment_report_combination'
    }); 
    await queryInterface.addConstraint('ForumCommentReports', {
      type: 'unique',
      fields: ['commentId', 'commentUserId'],
      name: 'unique_forum_comment_report_combination'
    }); 
    await queryInterface.addConstraint('GroupCommentReports', {
      type: 'unique',
      fields: ['commentId', 'commentUserId'],
      name: 'unique_group_comment_report_combination'
    }); 
    await queryInterface.addConstraint('ServiceReports', {
      type: 'unique',
      fields: ['serviceId', 'userId'],
      name: 'unique_service_report_combination'
    });   
  }
};
