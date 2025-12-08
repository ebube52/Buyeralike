const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ForumCommentUserReaction extends Model {
    static associate(models) {
      ForumCommentUserReaction.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      ForumCommentUserReaction.belongsTo(models.ForumComment, { foreignKey: 'commentId', as: 'forumComment' });  
    }
  }

  ForumCommentUserReaction.init(
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
      modelName: 'ForumCommentUserReaction',
      timestamps: true,
    }
  );

  return ForumCommentUserReaction;
};



/*
const mongoose = require('mongoose')

const Schema = mongoose.Schema

const ForumCommentUserReactionSchema = new Schema(
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

module.exports = mongoose.model('ForumCommentUserReaction', ForumCommentUserReactionSchema)
*/