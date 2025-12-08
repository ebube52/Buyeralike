'use strict';

const {
  Model, Sequelize
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ForumCommentUserReaction extends Model {
    static associate(models) {
      ForumCommentUserReaction.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      ForumCommentUserReaction.belongsTo(models.ForumComment, { foreignKey: 'commentId', as: 'forumComment' });  
    }
  }

  ForumCommentUserReaction.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,         
      primaryKey: true,       
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
  }, {
    sequelize,
    modelName: 'ForumCommentUserReaction',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'commentId'],
      },
    ],
  });
  
  return ForumCommentUserReaction;
};