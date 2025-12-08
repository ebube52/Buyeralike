'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'viewCount', {
      type: Sequelize.INTEGER
    });
    await queryInterface.addColumn('Groups', 'viewCount', {
      type: Sequelize.INTEGER
    });    
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'viewCount');
    await queryInterface.removeColumn('Groups', 'viewCount');
  }
};
