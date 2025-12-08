const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FeedbackComment extends Model {
    static associate(models) {
      FeedbackComment.belongsTo(models.User, { foreignKey: 'commentUserId', as: 'user' });      
      FeedbackComment.belongsTo(models.User, { foreignKey: 'userId', as: 'userService' });       
      FeedbackComment.belongsTo(models.FeedbackComment, { foreignKey: 'parentId', as: 'feedbackCommentParent' });
      FeedbackComment.hasMany(models.FeedbackComment, { foreignKey: 'parentId', as: 'feedbackCommentReplies' });    
    }
  }

  FeedbackComment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },      
      text: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      image: {
        type: DataTypes.STRING,
      },
      parentId: {
        type: DataTypes.STRING,
      },
      repliesSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      depth: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
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
      modelName: 'FeedbackComment',
      timestamps: true,
    }
  );

  return FeedbackComment;
};



/*
const mongoose = require('mongoose')

const Schema = mongoose.Schema

const FeedbackCommentSchema = new Schema(
  {
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
    userId: {
      type: String,
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

module.exports = mongoose.model('FeedbackComment', FeedbackCommentSchema)
*/