const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ForumComment extends Model {
    static associate(models) {
      ForumComment.belongsTo(models.User, { foreignKey: 'commentUserId', as: 'user' });
      ForumComment.belongsTo(models.ForumComment, { foreignKey: 'parentId', as: 'forumCommentParent' });
      ForumComment.hasMany(models.ForumComment, { foreignKey: 'parentId', as: 'forumCommentReplies' });      
    }
  }

  ForumComment.init(
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
      category: {
        type: DataTypes.STRING,
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
      modelName: 'ForumComment',
      timestamps: true,
    }
  );

  return ForumComment;
};



/*
const mongoose = require('mongoose')

const uniqueValidator = require('mongoose-unique-validator')

const Schema = mongoose.Schema

const ForumCommentSchema = new Schema(
  {
    slug: {
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
    category: {
      type: String,
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

ForumCommentSchema.plugin(uniqueValidator, { message: '{PATH} already exists.' })

module.exports = mongoose.model('ForumComment', ForumCommentSchema)
*/