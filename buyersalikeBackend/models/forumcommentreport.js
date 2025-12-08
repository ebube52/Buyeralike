'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ForumCommentReport extends Model {
    static associate(models) {
      ForumCommentReport.belongsTo(models.User, { foreignKey: 'commentUserId', as: 'user' });
      ForumCommentReport.belongsTo(models.User, { foreignKey: 'reportBy', as: 'userReporting' });
      ForumCommentReport.belongsTo(models.ForumComment, { foreignKey: 'category', targetKey: 'category',  as: 'forumCommentCategory' });
      ForumCommentReport.belongsTo(models.ForumComment, { foreignKey: 'commentId', as: 'forumComment' });     
    }
  }
  ForumCommentReport.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,         
      primaryKey: true,       
      allowNull: false,        
    }, 
    reportBy: {
      type: DataTypes.UUID,
      allowNull: false,   
    },    
    commentId: {
      type: DataTypes.UUID,
      allowNull: false,   
    },
    commentUserId: {
      type: DataTypes.UUID,
      allowNull: false,   
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,   
    },
    reportReasons: {
      type: DataTypes.STRING,
      allowNull: false, 
    },
    report: {
      type: DataTypes.TEXT('medium')
    },
  }, {
    sequelize,
    modelName: 'ForumCommentReport',
  });
  return ForumCommentReport;
};