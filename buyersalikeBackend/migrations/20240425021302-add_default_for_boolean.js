'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.changeColumn('FeedbackComments', 'reported', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('FeedbackComments', 'locked', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('FeedbackComments', 'deleted', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('ForumComments', 'reported', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('ForumComments', 'locked', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('ForumComments', 'deleted', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('ForumComments', 'fp', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      }),
      queryInterface.changeColumn('GroupComments', 'reported', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('GroupComments', 'locked', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('GroupComments', 'deleted', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('GroupComments', 'fp', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      }),
      queryInterface.changeColumn('Groups', 'locked', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('Groups', 'deleted', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('Services', 'reported', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('Services', 'locked', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('Services', 'deleted', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('Users', 'suspended', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('Users', 'locked', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
      queryInterface.changeColumn('Users', 'deleted', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
    ]);
  },

  async down(queryInterface, Sequelize) {
    // No need to revert the changes made in the up function, 
    // as we're just adding default values and not altering the structure of the tables.
  }
};
