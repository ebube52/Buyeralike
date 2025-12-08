// models/openingCategory.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OpeningCategory extends Model {
    static associate(models) {
      OpeningCategory.hasMany(models.Opening, { foreignKey: 'openingCategoryId', as: 'openings' });
    }
  }

  OpeningCategory.init({
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
  }, {
    sequelize,
    modelName: 'OpeningCategory',
    hooks: {
      beforeValidate: (openingCategory, options) => {
        if (openingCategory.name) {
          openingCategory.slug = openingCategory.name.toLowerCase()
                                      .replace(/[^a-z0-9 -]/g, '')
                                      .replace(/\s+/g, '-')
                                      .replace(/-+/g, '-');
        }
      },
    },
  });

  return OpeningCategory;
};