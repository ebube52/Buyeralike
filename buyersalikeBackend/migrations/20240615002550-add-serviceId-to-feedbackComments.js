'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('FeedbackComments', 'serviceId', {
      type: Sequelize.UUID,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('FeedbackComments', 'serviceId');
  }
};
