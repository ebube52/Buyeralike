const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GroupComment extends Model {
    static associate(models) {
      GroupComment.belongsTo(models.User, { foreignKey: 'commentUserId', as: 'user' });
      GroupComment.belongsTo(models.Group, { foreignKey: 'groupId', as: 'group' });
      GroupComment.hasMany(models.GroupCommentUserReaction, { foreignKey: 'groupId', as: 'groupCommentUserReactions' });  
      GroupComment.belongsTo(models.GroupComment, { foreignKey: 'parentId', as: 'groupCommentParent' });
      GroupComment.hasMany(models.GroupComment, { foreignKey: 'parentId', as: 'groupCommentReplies' });
    }
  }

  GroupComment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },      
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      groupId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      groupName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
      },
      text: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      image: {
        type: DataTypes.STRING,
      },
      parentId: {
        type: DataTypes.UUID,
      },
      repliesSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      depth: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fp: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      commentUserId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      likes: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      dislikes: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'GroupComment',
      timestamps: true,
    }
  );

  return GroupComment;
};



/*
const mongoose = require('mongoose')

const uniqueValidator = require('mongoose-unique-validator')

const Schema = mongoose.Schema

const GroupCommentSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,  
    },   
    groupId: {
      type: String,
      required: true,
    }, 
    groupName: {
      type: String,
      required: true,
    },        
    title: {
      type: String,
    },    
    text: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    parentId: {
      type: String,
    },
    repliesSize: {
      type: Number,
      required: true,
    },
    depth: {
      type: Number,
      required: true,
    },  
    fp: {
      type: Boolean,
      required: true,
    },             
    commentUserId: {
      type: String,
      required: true,
    },
    likes: {
      type: Number,
      required: true,
    },
    dislikes: {
      type: Number,
      required: true,
    }    
  },
  { timestamps: true }
)

GroupCommentSchema.plugin(uniqueValidator, { message: '{PATH} already exists.' })

module.exports = mongoose.model('GroupComment', GroupCommentSchema)
*/