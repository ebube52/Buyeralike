'use strict';

const models = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('Users', { id: Sequelize.INTEGER });
     */
    await queryInterface.changeColumn('GroupComments', 'slug', { 
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        async isUniqueSlug(value) {
          if (this.depth === 0) {
            const existingComment = await models.GroupComment.findOne({
              where: { slug: value, depth: 0 },
            });
  
            if (existingComment && existingComment.id !== this.id) {
              throw new Error('Slug must be unique when depth is 0.');
            }
          }
        },
      },
    });
    await queryInterface.changeColumn('ForumComments', 'slug', { 
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        async isUniqueSlug(value) {
          if (this.depth === 0) {
            const existingComment = await models.ForumComment.findOne({
              where: { slug: value, depth: 0 },
            });
  
            if (existingComment && existingComment.id !== this.id) {
              throw new Error('Slug must be unique when depth is 0.');
            }
          }
        },
      },
    });      
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('Users');
     */
    await queryInterface.changeColumn('GroupComments', 'slug');
    await queryInterface.changeColumn('ForumComments', 'slug');      
  }
};
