const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FeedbackCommentUserReaction extends Model {
    static associate(models) {
      FeedbackCommentUserReaction.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      FeedbackCommentUserReaction.belongsTo(models.FeedbackComment, { foreignKey: 'commentId', as: 'feedbackComment' });  
    }
  }

  FeedbackCommentUserReaction.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },      
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      commentId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      liked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      disliked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'FeedbackCommentUserReaction',
      timestamps: true,
    }
  );

  return FeedbackCommentUserReaction;
};



/*
const mongoose = require('mongoose')

const Schema = mongoose.Schema

const FeedbackCommentUserReactionSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    commentId: {
      type: String,
      required: true,
    },    
    liked: {
      type: Boolean,
      required: true,
      
    },
    disliked: {
      type: Boolean,
      required: true,
    }    
  },
  { timestamps: true }
)

module.exports = mongoose.model('FeedbackCommentUserReaction', FeedbackCommentUserReactionSchema)
*/