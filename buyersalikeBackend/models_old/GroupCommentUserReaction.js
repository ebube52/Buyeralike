const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GroupCommentUserReaction extends Model {
    static associate(models) {
      GroupCommentUserReaction.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      GroupCommentUserReaction.belongsTo(models.Group, { foreignKey: 'groupId', as: 'group' });
      GroupCommentUserReaction.belongsTo(models.GroupComment, { foreignKey: 'commentId', as: 'groupComment' });     
    }
  }

  GroupCommentUserReaction.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },      
      groupId: {
        type: DataTypes.UUID,
        allowNull: false,
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
      modelName: 'GroupCommentUserReaction',
      timestamps: true,
    }
  );

  return GroupCommentUserReaction;
};



/*
const mongoose = require('mongoose')

const Schema = mongoose.Schema

const GroupCommentUserReactionSchema = new Schema(
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

module.exports = mongoose.model('GroupCommentUserReaction', GroupCommentUserReactionSchema)
*/