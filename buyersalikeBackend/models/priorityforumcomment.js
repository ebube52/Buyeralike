'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PriorityForumComment extends Model {
    static associate(models) {
      PriorityForumComment.belongsTo(models.ForumComment, { foreignKey: 'commentId', as: 'forumComment' });
    }
  }
  PriorityForumComment.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,         
      primaryKey: true,       
      allowNull: false,        
    },       
    commentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    bid: {
      type: DataTypes.STRING,
    }, 
  }, {
    sequelize,
    modelName: 'PriorityForumComment',
  });
  return PriorityForumComment;
};