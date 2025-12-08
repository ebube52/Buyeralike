const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
//const { Service } = require('../models/Service')
//const { ForumComment } = require('../models/ForumComment')
const models = require('../models');
const { Op } = require('sequelize');

// @desc    Get tapSlug
// @route   GET /api/v1/tapSlug/:username/:slug
exports.gettapSlug = asyncHandler(async (req, res, next) => {
  const username = req.params.username;
  const slug = req.params.slug;

  if (username === 'frmFrm') {
    const comments = await models.ForumComment.findAll({
      where: { slug, depth: 0, deleted: 0 },
      attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'forumCategoryId', 'fp', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked','viewsCount']
    });

    if (!comments || comments.length === 0) {
      return next(new ErrorResponse('Posts not found'));
    }

    const comment = await models.ForumComment.findOne({
      where: {
        slug: slug,
        [Op.or]: [
          { parentId: null },
          { parentId: '' },
          { parentId: { [Op.eq]: undefined } }
        ]
      }
    });
    
    if (comment) {
      const updatedViewsCount = comment.viewsCount + 1; 
      const updatedRows = await models.ForumComment.update(
        { 
          viewsCount: updatedViewsCount
        },
        { 
          where: { 
            slug: slug,
            [Op.or]: [
              { parentId: null },
              { parentId: '' },
              { parentId: { [Op.eq]: undefined } }
            ]
          } 
        }
      );  
    }

    res.status(200).json({ success: true, data: comments });
  }
});



/*
const asyncHandler = require('../middleware/async')
const ErrorResponse = require('../utils/errorResponse')
const Service = require('../models/Service')
const ForumComment = require('../models/ForumComment')


// @desc    Get tapSlug
// @route   GET /api/v1/tapSlug/:username/:slug
exports.gettapSlug = asyncHandler(async (req, res, next) => {
  const username = req.params.username;
  const slug = req.params.slug;  

  if (username == "frm") {
    const comment = await ForumComment.find({ slug, depth: 0 })
      .select('id slug title text image parentId repliesSize depth category fp commentUserId createdAt likes dislikes');      

    if (!comment) {
      return next(new ErrorResponse(`Posts not found`))
    }      
    res.status(200).json({ success: true, data: comment })  
  } else {
    const service = await Service.find({ slug })
      .select('id slug userId username category serviceDescription charge chargeDuration name type url');        

    if (!service) {
      return next(new ErrorResponse(`Services not found`))
    }   
    res.status(200).json({ success: true, data: service })    
  }   
})
*/