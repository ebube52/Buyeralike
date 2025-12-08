const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Group extends Model {
    static associate(models) {
      Group.belongsToMany(models.User, { through: 'UserGroup', foreignKey: 'groupId' });
      Group.hasMany(models.GroupComment, { foreignKey: 'groupId', as: 'groupComments' });     
      Group.hasMany(models.GroupCommentUserReaction, { foreignKey: 'groupId', as: 'groupCommentUserReactions' });        
    }
  }

  Group.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },      
      creatorUserId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      creatorUserName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      accessType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      about: {
        type: DataTypes.STRING,
        validate: {
          len: {
            args: [0, 1000],
            msg: 'About data exceeds 1000 characters!',
          },
        },
      },
      profilePhoto: {
        type: DataTypes.STRING,
        defaultValue: 'profilePhoto.png',
      },
      coverPhoto: {
        type: DataTypes.STRING,
        defaultValue: 'coverPhoto.png',
      },
      member: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Group',
      timestamps: true,
    }
  );

  Group.addHook('beforeValidate', (group) => {
    // Validate about field
    if (group.about) {
      const wordCount = group.about.trim().length;
      if (wordCount > 1000) {
        throw new Error('About data exceeds 1000 characters!');
      }
    }
  });

  return Group;
};


/*
const mongoose = require('mongoose')

const uniqueValidator = require('mongoose-unique-validator')

const Schema = mongoose.Schema

const GroupSchema = new Schema(
  {
    creatorUserId: {
      type: String,
      required: true,
    },
    creatorUserName: {
      type: String,
      required: true,
    },        
    accessType: {
      type: String,
      required: true,
    },      
    name: {
      type: String,
      maxlength: [30, 'Must not be more than thirty characters long'],  
      unique: true,
      uniqueCaseInsensitive: true      
    },
    about: {
      type: String,
      validate: {
        validator: function(v) {
          const wordCount = v.trim().length;
          return wordCount <= 1000; 
        },
        message: props => `About data exceeds 1000 characters!`
      }
    },
    profilePhoto: { 
      type: String,
      default: 'profilePhoto.png'
    },
    coverPhoto: { 
      type: String,
      default: 'coverPhoto.png'
    },   
    member: {
      type: Number,
      required: true,
    },    
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true }
)

GroupSchema.plugin(uniqueValidator, { message: '{PATH} already exists.' })

module.exports = mongoose.model('Group', GroupSchema)
*/