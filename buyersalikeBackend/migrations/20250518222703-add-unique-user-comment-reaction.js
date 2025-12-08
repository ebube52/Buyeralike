'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint('ForumCommentUserReactions', {
      fields: ['userId', 'commentId'],
      type: 'unique',
      name: 'unique_user_comment_reaction'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('ForumCommentUserReactions', 'unique_user_comment_reaction');
  }
};
