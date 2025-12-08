// models/forumCategory.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ForumCategory extends Model {
    static associate(models) {
      ForumCategory.hasMany(models.ForumComment, { foreignKey: 'forumCategoryId', as: 'forumcomments' });
    }
  }

  ForumCategory.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Category name cannot be empty',
        },
        len: {
          args: [3, 100],
          msg: 'Category name must be between 3 and 100 characters',
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: 'Category description cannot exceed 500 characters',
        },
      },
    },
    slug: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'MessageCircle',
      validate: {
        len: {
          args: [0, 50],
          msg: 'Icon name cannot exceed 50 characters',
        },
      },
    },    
  }, {
    sequelize,
    modelName: 'ForumCategory',
    hooks: {
      beforeValidate: (forumCategory, options) => {
        if (forumCategory.name) {
          forumCategory.slug = forumCategory.name.toLowerCase()
                                      .replace(/[^a-z0-9 -]/g, '')
                                      .replace(/\s+/g, '-')
                                      .replace(/-+/g, '-');
        }
      },
    },
  });

  return ForumCategory;
};