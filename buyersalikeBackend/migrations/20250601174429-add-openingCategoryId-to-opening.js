'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Openings', 'openingCategoryId', {
      type: Sequelize.UUID,
      allowNull: true, 
      references: {
        model: 'OpeningCategories', 
        key: 'id',                
      },
      onUpdate: 'CASCADE', 
      onDelete: 'SET NULL', 
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Openings', 'openingCategoryId');
  }
};