const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserGroup extends Model {
  }

  UserGroup.init(
    {
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      groupId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'UserGroup',
      timestamps: true,
    }
  );

  return UserGroup;
};



/*
const mongoose = require('mongoose')

const Schema = mongoose.Schema

const UserGroupSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },    
    groupId: {
      type: String,
      required: true,
    },        
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true }
)

module.exports = mongoose.model('UserGroup', UserGroupSchema)
*/