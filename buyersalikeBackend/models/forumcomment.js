'use strict';
const models = require('../models');

const {
  Model, Sequelize
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ForumComment extends Model {
    static associate(models) {
      ForumComment.belongsTo(models.User, { foreignKey: 'commentUserId', as: 'user' });
      ForumComment.hasMany(models.ForumCommentUserReaction, { foreignKey: 'commentId', as: 'forumCommentUserReactions' });
      ForumComment.belongsTo(models.ForumComment, { foreignKey: 'parentId', as: 'forumCommentParent' });
      ForumComment.hasMany(models.ForumComment, { foreignKey: 'parentId', as: 'forumCommentReplies' });          
      ForumComment.hasMany(models.ForumCommentReport, { foreignKey: 'category', as: 'forumCommentReportCategories' });   
      ForumComment.hasMany(models.ForumCommentReport, { foreignKey: 'commentId', as: 'forumCommentReports' });   
      ForumComment.hasOne(models.PriorityForumComment, { foreignKey: 'commentId', as: 'priorityForumComment' }); 
      ForumComment.belongsTo(models.ForumCategory, { foreignKey: 'forumCategoryId', as: 'forumCategory' });
    }
  }

  ForumComment.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,         
      primaryKey: true,       
      allowNull: false,        
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [0, 250],
        async isUniqueSlug(value) {
          if (this.depth === 0) {
            const existingComment = await ForumComment.findOne({
              where: { slug: value, depth: 0 },
            });
  
            if (existingComment && existingComment.id !== this.id) {
              throw new Error('Slug must be unique');
            }
          }
        },
      },
    },
    title: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 100],
        isValidText(value) {
          const strings = value.split(' ');
  
          for (const str of strings) {
            if (str.length > 50) {
              throw new Error('Each string in the text must not exceed 50 characters.');
            }
          }
        }, 
      },      
    },
    text: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [0, 1000],
        isValidText(value) {
          const strings = value.split(' ');
  
          for (const str of strings) {
            if (str.length > 50) {
              throw new Error('Each string in the text must not exceed 50 characters.');
            }
          }
        }, 
      },      
    },
    image: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 200],
      },       
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
      validate: {
        len: [0, 100],
        isValidText(value) {
          const strings = value.split(' ');
  
          for (const str of strings) {
            if (str.length > 50) {
              throw new Error('Each string in the text must not exceed 50 characters.');
            }
          }
        },   
      },        
    },
    fp: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    viewsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },        
    reported: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },    
    numberOfReports: {
      type: DataTypes.INTEGER,
    },        
    locked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },         
    fpTime: {
      allowNull: false,
      type:  DataTypes.DATE
    },    
    lockedTime: {
      allowNull: false,
      type:  DataTypes.DATE
    },  
    lockedBy: {
      type: DataTypes.UUID,
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },  
    deleteTime: {
      allowNull: false,
      type:  DataTypes.DATE
    },  
    deletedBy: {
      type: DataTypes.UUID,
    },
    forumCategoryId: {
      type: DataTypes.UUID,
      allowNull: false,
    },    
  }, {
    sequelize,
    modelName: 'ForumComment',
  });
  return ForumComment;
};