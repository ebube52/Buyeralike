'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('Users', 'viewCount', 'viewsCount');
    await queryInterface.changeColumn('Users', 'viewsCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.renameColumn('Groups', 'viewCount', 'viewsCount');
    await queryInterface.changeColumn('Groups', 'viewsCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.renameColumn('ForumComments', 'viewCounts', 'viewsCount');
    await queryInterface.changeColumn('ForumComments', 'viewsCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.renameColumn('FeedbackComments', 'viewCounts', 'viewsCount');
    await queryInterface.changeColumn('FeedbackComments', 'viewsCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.renameColumn('GroupComments', 'viewCounts', 'viewsCount');
    await queryInterface.changeColumn('GroupComments', 'viewsCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.renameColumn('Services', 'viewCounts', 'viewsCount');
    await queryInterface.changeColumn('Services', 'viewsCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('Users', 'viewsCount', 'viewCount');
    await queryInterface.changeColumn('Users', 'viewCount', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.renameColumn('Groups', 'viewsCount', 'viewCount');
    await queryInterface.changeColumn('Groups', 'viewCount', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.renameColumn('ForumComments', 'viewsCount', 'viewCounts');
    await queryInterface.changeColumn('ForumComments', 'viewCounts', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.renameColumn('FeedbackComments', 'viewsCount', 'viewCounts');
    await queryInterface.changeColumn('FeedbackComments', 'viewCounts', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.renameColumn('GroupComments', 'viewsCount', 'viewCounts');
    await queryInterface.changeColumn('GroupComments', 'viewCounts', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.renameColumn('Services', 'viewsCount', 'viewCounts');
    await queryInterface.changeColumn('Services', 'viewCounts', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });
  }
};
