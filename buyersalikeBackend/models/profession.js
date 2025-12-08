// models/profession.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Profession extends Model {
    static associate(models) {
      Profession.hasMany(models.User, { foreignKey: 'professionId', as: 'users' });
    }
  }

  Profession.init({
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
    modelName: 'Profession',
    hooks: {
      beforeValidate: (profession, options) => {
        if (profession.name) {
          profession.slug = profession.name.toLowerCase()
                                      .replace(/[^a-z0-9 -]/g, '')
                                      .replace(/\s+/g, '-')
                                      .replace(/-+/g, '-');
        }
      },
    },
  });

  return Profession;
};