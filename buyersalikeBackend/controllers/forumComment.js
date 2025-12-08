const asyncHandler = require('../middleware/async')
const ErrorResponse = require('../utils/errorResponse')
//const { ForumComment } = require('../models/ForumComment')
const { Op } = require('sequelize');
const models = require('../models');
const path = require('path');
const fs = require('fs');
const {promisify} = require('util');
const unlinkAsync = promisify(fs.unlink);
const { JSDOM } = require('jsdom');
const { window } = new JSDOM('');
const DOMPurify = require('dompurify')(window);
const { Sequelize } = require('sequelize');
const { sanitizeText } = require('../utils/textSanitizer');
const Redis = require('ioredis');
const redisClient = new Redis(); 
const { renameFirstImage, convertURLToFilePath, renameFile } = require('../helper/mediaUtils');
const config = require('../utils/config');
const { forumPostLimits } = config;
const moment = require('moment-timezone');
const { createNotification } = require('../utils/notificationService');

// @desc    Toggle FP property
// @route   POST /api/v1/forumComment/toggleFP
// @access  Private (admin roles only)
exports.toggleForumPostFP = asyncHandler(async (req, res, next) => {
  const { forumCommentId } = req.body;

  if (!forumCommentId) {
    return res.status(400).json({ success: false, error: 'Forum comment ID is required' });
  }

  try {
    const forumComment = await models.ForumComment.findOne({
      attributes: ['fp', 'fpTime', 'commentUserId', 'title'],
      where: { id: forumCommentId }
    });

    if (!forumComment) {
      return res.status(404).json({ success: false, error: 'Forum comment not found' });
    }

    const newFPStatus = !forumComment.fp;
    const currentTime = new Date();

    await models.ForumComment.update(
      { 
        fp: newFPStatus,
        fpTime: currentTime
      },
      { where: { id: forumCommentId } }
    );

    if (forumComment && forumComment.commentUserId) {
      const notificationMessage = newFPStatus
        ? `Forum post "${forumComment.title}" has been featured!`
        : `Forum post "${forumComment.title}" is no longer featured.`;
      await createNotification(
        forumComment.commentUserId,
        'forum_post_featured_status',
        notificationMessage,
        'ForumComment',
        forumCommentId
      );
    }    

    res.status(200).json({ 
      success: true, 
      data: { 
        fp: newFPStatus, 
        fpTime: currentTime 
      } 
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Count forumComment
// @route   GET /api/v1/forumComment/count
exports.countForumPosts = asyncHandler(async (req, res, next) => {
  const forumCommentCount = await models.ForumComment.count({
    where: {
      depth:0,
      deleted: 0
    }
  });

  const groupCommentCount = await models.GroupComment.count({
    where: {
      depth: 0,
      deleted: 0
    }
  });

  const totalComments = forumCommentCount + groupCommentCount;

  res.status(200).json({ success: true, data: { total: totalComments } });
});

// @desc    Get forum-wide statistics
// @route   GET /api/v1/forum/stats
exports.getForumStats = asyncHandler(async (req, res, next) => {
    const totalPosts = await models.ForumComment.count({
        where: { depth: 0, deleted: false },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeMembers = await models.ForumComment.count({
        where: {
            createdAt: { [Op.gte]: thirtyDaysAgo },
            deleted: false
        },
        distinct: true,
        col: 'commentUserId'
    });

    const totalViews = await models.ForumComment.sum('viewsCount');

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const twoMonthsAgo = new Date(lastMonth);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 1);
    
    const currentMonthPosts = await models.ForumComment.count({
        where: {
            createdAt: { [Op.between]: [lastMonth, new Date()] },
            deleted: false
        }
    });

    const previousMonthPosts = await models.ForumComment.count({
        where: {
            createdAt: { [Op.between]: [twoMonthsAgo, lastMonth] },
            deleted: false
        }
    });

    let postGrowthRate = 0;
    if (previousMonthPosts > 0) {
        postGrowthRate = ((currentMonthPosts - previousMonthPosts) / previousMonthPosts * 100).toFixed(2);
    } else if (currentMonthPosts > 0) {
        postGrowthRate = 100;
    }

    res.status(200).json({
        success: true,
        data: {
            totalPosts: totalPosts,
            activeMembers: activeMembers,
            totalViews: totalViews,
            growthRate: postGrowthRate
        }
    });
});

// @desc    Create forumComment
// @route   POST /api/v1/forumComment
exports.createForumComment = asyncHandler(async (req, res, next) => {
  const { slug, title, text, image, parentId, repliesSize, depth, category, fp, commentUserId, forumCategoryId, likes, dislikes } = req.body;
  const sanitisedText = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['p', 'br', 'ul', 'ol', 'li'],
  });
  const sanitisedTitle = sanitizeText(title);
  const sanitisedText1 = sanitizeText(sanitisedText);

  let slugg;
  let newComment;

  const parentComment = await models.ForumComment.findByPk(parentId);
  if (depth) {    
    if (parentComment && parentComment.locked) {
      return res.status(403).json({
        success: false,
        message: 'Cannot reply to a locked comment.',
      });
    }

    newComment = await models.ForumComment.create({
      title,
      slug,
      text: sanitisedText1,
      image,
      parentId,
      repliesSize,
      depth,
      category: category,
      forumCategoryId,
      fp,
      commentUserId,
      likes,
      dislikes,
      fpTime: new Date(),
      lockedTime: new Date(),
      deleteTime: new Date()
    });
  } else {
    slugg = createSlug(category + "-" + sanitisedTitle);
    let existingComment = await models.ForumComment.findOne({ where: { slug: slugg } });

    while (existingComment) {
      const randomString = Math.random().toString(36).substring(7);
      slugg = `${slugg}-${randomString}`;
      existingComment = await models.ForumComment.findOne({ where: { slug: slugg } });
    }

    if (image) {
      const result = renameFirstImage('image', image, `${slugg}.jpg`);
      if (result) {
        const { oldUrl, newUrl, updatedUrls } = result;
        const oldFilePath = convertURLToFilePath(oldUrl);
        const newFilePath = convertURLToFilePath(newUrl);
    
        try {
          await renameFile(oldFilePath, newFilePath);
          //console.log(`Renamed: ${oldFilePath} to ${newFilePath}`);
        } catch (err) {
          //console.error(`Error renaming file: ${err}`);
        }
    
        newComment = await models.ForumComment.create({
          title: sanitisedTitle,
          slug: slugg,
          text: sanitisedText1,
          image: updatedUrls,
          parentId,
          repliesSize,
          depth,
          category: category,
          forumCategoryId,
          fp,
          commentUserId,
          likes,
          dislikes,
          fpTime: new Date(),
          lockedTime: new Date(),
          deleteTime: new Date()
        });     
      }
    } else {
      newComment = await models.ForumComment.create({
        title: sanitisedTitle,
        slug: slugg,
        text: sanitisedText1,
        image,
        parentId,
        repliesSize,
        depth,
        category: category,
        forumCategoryId,
        fp,
        commentUserId,
        likes,
        dislikes,
        fpTime: new Date(),
        lockedTime: new Date(),
        deleteTime: new Date()
      });       
    }
  }

  const addedComment = await models.ForumComment.findOne({
    where: { id: newComment.id },
    attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'forumCategoryId', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked','viewsCount','fp'],
  });

  if (addedComment) {
    if (depth) {
      if (parentComment) {
        const replyCount = await models.ForumComment.count({ where: { parentId: parentComment.id, deleted: 0 } });
        parentComment.repliesSize = replyCount;
        await parentComment.save();

        const notificationMessage = `Forum post "${parentComment.title}" has a new reply: "${addedComment.text.substring(0, 50)}..."`;
        await createNotification(
          parentComment.commentUserId,
          'new_forum_reply',
          notificationMessage,
          'ForumComment',
          addedComment.id
        );              
      }
      res.status(200).json({ success: true, data: addedComment })
    } else {
      const userComments = await models.ForumComment.findAll({
        where: { category: category, depth: 0, deleted: 0 },
        attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'forumCategoryId', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked','viewsCount','fp'],
        order: [['createdAt', 'DESC']],
      });

      const notificationMessage = `Forum post "${addedComment.title}" has been added."`;
      await createNotification(
        addedComment.commentUserId,
        'new_forum_post',
        notificationMessage,
        'ForumComment',
        addedComment.id
      );       

      res.status(200).json({ success: true, data: addedComment, data1: userComments });
    }  
  }  
});

// @desc    Get forumComment
// @route   GET /api/v1/forumComment/:hiDee
exports.getForumComment = asyncHandler(async (req, res, next) => {
  const category = req.params.hiDee;
  const { start, size, filters, globalFilter, sorting, search } = req.query;
	const startIndex = parseInt(start) || 0;
	const pageSize = parseInt(size) || 10;
  let whereCondition = {};
  //let requestCount;

  // const cacheKey = `${'forumComment'}_${category}_${start}_${size}_${filters}_${globalFilter}_${sorting}_${search}`;
  // const cachedData = await redisClient.get(cacheKey);
  // if (cachedData) {
  //   const cachedResult = JSON.parse(cachedData);
  //   const currentTime = Date.now();
  //   const expirationTime = cachedResult.timestamp + (5 * 60 * 1000);
  //   if (currentTime < expirationTime) {
  //     await redisClient.set(cacheKey, JSON.stringify(cachedResult));
  //     return res.status(200).json(cachedResult);
  //   } else {
  //     await redisClient.del(cacheKey);
  //   }
  // }  

  let cleanedSearch;
  
  if (search && (search != "undefined")) {
    cleanedSearch = search.trim().replace(/\s+/g, ' ');
    //const searchWords = search.slice(0, 50).split(" ");
    const searchWords = search.slice(0, 50).split(/\s+/).filter(Boolean);;

    whereCondition = {
      [Op.or]: searchWords.map(word => ({
        [Op.or]: [
          Sequelize.where(Sequelize.col('title'), 'LIKE', `%${word}%`),
          Sequelize.where(Sequelize.col('text'), 'LIKE', `%${word}%`),
          Sequelize.where(Sequelize.col('category'), 'LIKE', `%${word}%`)
        ]
      }))
    };
  }

  if (category && category.startsWith('parent-')) {
    const parentId = category.substring('parent-'.length);
    /*const comments = await models.ForumComment.findAll({
      where: { parentId },
      attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'forumCategoryId', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked','viewsCount','fp'],
    });

    if (!comments || comments.length === 0) {
      return next(new ErrorResponse('Posts not found'));
    }

    res.status(200).json({ success: true, data: comments });*/
    const comments = await models.ForumComment.findAndCountAll({
      attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'forumCategoryId', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked','viewsCount','fp'],
      where: { parentId, deleted: 0 },
      order: [
        ['createdAt', 'DESC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM ForumComments AS Replies WHERE Replies.parentId = ForumComment.id)"), 'DESC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM ForumCommentReports WHERE ForumCommentReports.commentId = ForumComment.id)"), 'ASC'],
      ],
      offset: startIndex,
      limit: pageSize,
    });      
  
    const { count, rows } = comments;
  
    let combinedComments;
    if (start == "0") {
      const priorityCommentsPlusComment = await models.PriorityForumComment.findAll({
        attributes: ['commentId'], 
        include: [{
          model: models.ForumComment,
          as: 'forumComment', 
          attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'forumCategoryId', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked','viewsCount','fp'],
          where: { parentId, deleted: 0 },
        }],
        order: [['bid', 'DESC']],
      });
  
      const priorityComments = priorityCommentsPlusComment.map(priorityComment => priorityComment.forumComment);
      combinedComments =  priorityComments.concat(rows);
    } else {
      combinedComments =  rows;
    }
  
    if (!combinedComments || combinedComments.length === 0) {
      return next(new ErrorResponse('Posts not found'));
    }     
  
    const response = {
      success: true,
      data: combinedComments,
      meta: {
        totalRowCount: count
      }
    };      

    res.status(200).json(response);    
  } else {
    if (category && category !== 'Forums Home') {
      const normalizedCategory = category.replace(/-/g, ' ');
      const hyphenatedCategory = category.toLowerCase().replace(/\s+/g, '-');      

      const comments = await models.ForumComment.findAndCountAll({
        attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'forumCategoryId', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked','viewsCount','fp'],
        where: {
          [Op.or]: [
            { category: normalizedCategory },
            { category: hyphenatedCategory },
          ],
          depth: 0,
          ...whereCondition,
          deleted: 0
        },        
        // where: { category, depth: 0, ...whereCondition, deleted: 0 },
        order: [
          ['createdAt', 'DESC'],
          [models.sequelize.literal("(SELECT COUNT(*) FROM ForumComments AS Replies WHERE Replies.parentId = ForumComment.id)"), 'DESC'],
          [models.sequelize.literal("(SELECT COUNT(*) FROM ForumCommentReports WHERE ForumCommentReports.commentId = ForumComment.id)"), 'ASC'],
        ],
        offset: startIndex,
        limit: pageSize,
      });      
    
      const { count, rows } = comments;
    
      let combinedComments;
      if (start == "0") {
        const priorityCommentsPlusComment = await models.PriorityForumComment.findAll({
          attributes: ['commentId'], 
          include: [{
            model: models.ForumComment,
            as: 'forumComment', 
            attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'forumCategoryId', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked','viewsCount','fp'],
            where: { category, depth: 0, ...whereCondition, deleted: 0 },
          }],
          order: [['bid', 'DESC']],
        });
    
        const priorityComments = priorityCommentsPlusComment.map(priorityComment => priorityComment.forumComment);
        combinedComments =  priorityComments.concat(rows);
      } else {
        combinedComments =  rows;
      }

      if (!combinedComments || combinedComments.length === 0) {
        const emptyResponse = {
          success: true,
          data: [],
          meta: {
            totalRowCount: 0
          }
        };
        const currentTime = Date.now();
        emptyResponse.timestamp = currentTime;
        // if (!cleanedSearch) {
        //   await redisClient.set(cacheKey, JSON.stringify(emptyResponse));
        // }
        return res.status(200).json(emptyResponse);
      }          
  
      const response = {
        success: true,
        data: combinedComments,
        meta: {
          totalRowCount: count
        }
      };
      const currentTime = Date.now();
      response.timestamp = currentTime;
      // if (!cleanedSearch) {
      //   await redisClient.set(cacheKey, JSON.stringify(response));
      // }

      res.status(200).json(response);        
    } else {
      const comments = await models.ForumComment.findAndCountAll({
        attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'forumCategoryId', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked','viewsCount','fp'],
        where: { fp: true, depth: 0, ...whereCondition, deleted: 0 },
        //where: { depth: 0, ...whereCondition, deleted: 0 },
        order: [
          //['createdAt', 'DESC'],
          ['fpTime', 'DESC'],
          [models.sequelize.literal("(SELECT COUNT(*) FROM ForumComments AS Replies WHERE Replies.parentId = ForumComment.id)"), 'DESC'],
          [models.sequelize.literal("(SELECT COUNT(*) FROM ForumCommentReports WHERE ForumCommentReports.commentId = ForumComment.id)"), 'ASC'],
        ],
        offset: startIndex,
        limit: pageSize,
      });      
    
      const { count, rows } = comments;
    
      let combinedComments;
      if (start == "0") {
        const priorityCommentsPlusComment = await models.PriorityForumComment.findAll({
          attributes: ['commentId'], 
          include: [{
            model: models.ForumComment,
            as: 'forumComment', 
            attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'forumCategoryId', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked','viewsCount','fp'],
            where: { fp: true, depth: 0, ...whereCondition, deleted: 0 },
          }],
          order: [['bid', 'DESC']],
        });
    
        const priorityComments = priorityCommentsPlusComment.map(priorityComment => priorityComment.forumComment);
        combinedComments =  priorityComments.concat(rows);
      } else {
        combinedComments =  rows;
      }

      if (!combinedComments || combinedComments.length === 0) {
        const emptyResponse = {
          success: true,
          data: [],
          meta: {
            totalRowCount: 0
          }
        };
        const currentTime = Date.now();
        emptyResponse.timestamp = currentTime;
        // if (!cleanedSearch) {
        //   await redisClient.set(cacheKey, JSON.stringify(emptyResponse));
        // }
        return res.status(200).json(emptyResponse);
      }      
 
  
      const response = {
        success: true,
        data: combinedComments,
        meta: {
          totalRowCount: count
        }
      };
      const currentTime = Date.now();
      response.timestamp = currentTime;
      // if (!cleanedSearch) {
      //   await redisClient.set(cacheKey, JSON.stringify(response));
      // }
      res.status(200).json(response);      
    }
  }
});

// @desc    Get forumComment by UserId
// @route   GET /api/v1/forumComment/:post/:hiDee
exports.getForumCommentByUserId = asyncHandler(async (req, res, next) => {
  const commentUserId = req.params.hiDee;
  const { start, size, filters, globalFilter, sorting, search } = req.query;
	const startIndex = parseInt(start) || 0;
	const pageSize = parseInt(size) || 10;

  const comments = await models.ForumComment.findAndCountAll({
    attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'forumCategoryId', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked','viewsCount','fp'],
    where: { commentUserId, deleted: 0 },
    order: [
      ['createdAt', 'DESC'],
    ],
    offset: startIndex,
    limit: pageSize,
  });      

  const { count, rows } = comments;

  if (!rows || rows.length === 0) {
    return next(new ErrorResponse('Posts not found'));
  }

  const response = {
    success: true,
    data: rows,
    meta: {
      totalRowCount: count
    }
  };      

  res.status(200).json(response);
});

// @desc    Get latest forum comments across all categories
// @route   GET /api/v1/forumComment/latest
// @access  Public (or adjust as needed)
exports.getLatestForumComments = asyncHandler(async (req, res, next) => {
    const { start, size } = req.query;
    const startIndex = parseInt(start) || 0;
    const pageSize = parseInt(size) || 10;

    const comments = await models.ForumComment.findAndCountAll({
        attributes: [
            'id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize',
            'depth', 'category', 'forumCategoryId', 'commentUserId', 'createdAt',
            'likes', 'dislikes', 'reported', 'numberOfReports', 'locked', 'viewsCount', 'fp'
        ],
        where: { parentId: null, deleted: 0 }, // Only fetch top-level posts, not replies
        order: [
            ['createdAt', 'DESC'], // Order by creation date, newest first
        ],
        offset: startIndex,
        limit: pageSize,
    });

    const { count, rows } = comments;

    // If no posts are found, return a success response with empty data
    if (!rows || rows.length === 0) {
        return res.status(200).json({
            success: true,
            data: [],
            meta: {
                totalRowCount: 0
            }
        });
    }

    const response = {
        success: true,
        data: rows,
        meta: {
            totalRowCount: count
        }
    };

    res.status(200).json(response);
});

// @desc    Update forumComment
// @route   PUT /api/v1/forumComment/:hiDee
exports.updateForumComment = asyncHandler(async (req, res, next) => {
  const commentId = req.params.hiDee;
  const { slug, title, text, image, parentId, repliesSize, depth, category, fp, commentUserId } = req.body;
  const sanitisedText = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['p', 'br', 'ul', 'ol', 'li'],
  });
  const sanitisedTitle = sanitizeText(title);
  const sanitisedText1 = sanitizeText(sanitisedText);

  const parentComment = await models.ForumComment.findByPk(parentId);
  // if (parentComment && parentComment.locked && depth) {
  //   return res.status(403).json({
  //     success: false,
  //     message: 'Cannot update a locked comment.',
  //   });
  // }  

  const childComment = await models.ForumComment.findOne({ where: { parentId: commentId, deleted: 0 } });
  // if (childComment) {
  //   return next(new ErrorResponse('Cannot edit a parent comment with child comments'));
  // }

  const comment = await models.ForumComment.findByPk(commentId);
  if (!comment) {
    return next(new ErrorResponse('Forum post not found'));
  }

  // if ((comment.likes > 0) || (comment.dislikes > 0)) {
  //   return next(new ErrorResponse('Cannot delete a comment with reactions'));
  // }

  if (req.user.id !== comment.commentUserId) {
    return next(new ErrorResponse('Record not found'));
  }  

  let slugg = slug;

  if (comment.title !== sanitisedTitle) {
    slugg = createSlug(category + "-" + sanitisedTitle);
    let existingComment = await models.ForumComment.findOne({ where: { slug: slugg } });
  
    while (existingComment) {
      const randomString = Math.random().toString(36).substring(7);
      slugg = `${slugg}-${randomString}`;
      existingComment = await models.ForumComment.findOne({ where: { slug: slugg } });
    }
    comment.slug = slugg;
  }

  if (depth) {
    comment.image = image; 
  } else  {
    if (image) {
      const result = renameFirstImage('image', image, `${slugg}.jpg`);
      if (result) {
        const { oldUrl, newUrl, updatedUrls } = result;
        const oldFilePath = convertURLToFilePath(oldUrl);
        const newFilePath = convertURLToFilePath(newUrl);
    
        try {
          await renameFile(oldFilePath, newFilePath);
        } catch (err) {
        }
        comment.image = updatedUrls;     
      }
    } else {
      comment.image = image;
    }
  }

  comment.title = sanitisedTitle || comment.title;
  comment.text = sanitisedText1 || comment.text;

  const editedCommentFromDb = await comment.save();
  const editedComment = await models.ForumComment.findByPk(editedCommentFromDb.id, {
    attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'forumCategoryId', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked','viewsCount','fp'],
  });

  const notificationMessage = `Forum post "${editedComment.text.substring(0, 50)}" has been updated.`;
  await createNotification(
    editedComment.commentUserId,
    'forum_post_updated',
    notificationMessage,
    'ForumComment',
    editedComment.id
  );

  res.status(200).json({ success: true, data: editedComment });
});

// @desc    Delete forumComment
// @route   DELETE /api/v1/auth/forumComment/:hiDee
exports.deleteForumComment = asyncHandler(async (req, res, next) => {
  const commentId = req.params.hiDee;
  const { parentId, depth } = req.body;

  // Check if the comment has child comments
  const childComment = await models.ForumComment.findOne({ where: { parentId: commentId, deleted: 0 } });
  if (childComment) {
    return next(new ErrorResponse('Cannot delete a parent comment with child comments'));
  }

  // Find the forum comment
  const comment = await models.ForumComment.findByPk(commentId, { include: getAllAssociations(models.ForumComment) });
  if (!comment) {
    return next(new ErrorResponse('Forum post not found'));
  }

  if (((comment.likes > 0) || (comment.dislikes > 0)) && (req.user.role !== 'adminL5')) {
    return next(new ErrorResponse('Cannot delete a comment with reactions'));
  }

  // Check if the current user is the author of the comment
  if ((req.user.id !== comment.commentUserId) && (req.user.role !== 'adminL5')) {
    return next(new ErrorResponse('Unauthorized to delete this forum comment'));
  }

  // Check if the forum comment has any dependent records
  const hasDependents = checkForumCommentDependents(comment);

  // If the forum comment has dependents, return an error response
  if (hasDependents && (req.user.role !== 'adminL5')) {
    return next(new ErrorResponse('Cannot delete forum comment with dependent records'));
  }

  if (comment.image) {
    //await unlinkAsync(convertURLToFilePath(comment.image));
  }

  // Delete the forum comment
  //await comment.destroy();
  comment.deleted = true;
  comment.deleteddBy = req.user.id;
  comment.deleteTime = new Date();
  await comment.save();

  // If the comment has a parent, update the parent's reply count
  if (depth && parentId) {
    const parentComment = await models.ForumComment.findByPk(parentId);
    if (parentComment) {
      const replyCount = await models.ForumComment.count({ where: { parentId: parentComment.id, deleted: 0 } });
      parentComment.repliesSize = replyCount;
      await parentComment.save();
    }
  }

  const notificationMessage = `Forum post "${comment.text.substring(0, 50)}" has been deleted.`;
  await createNotification(
    comment.commentUserId,
    'forum_post_deleted',
    notificationMessage,
    'ForumComment',
    comment.id
  );

  res.status(200).json({ success: true });
});

function getAllAssociations(model) {
  const associations = Object.values(model.associations);
  return associations.map(association => ({ model: association.target, as: association.as }));
}

function checkForumCommentDependents(comment) {
  return (
    (comment.forumCommentReports && comment.forumCommentReports.length > 0) ||
    (comment.forumCommentReplies && comment.forumCommentReplies.length > 0) ||
    (comment.forumCommentUserReactions && comment.forumCommentUserReactions.length > 0)
  );
}

function createSlug(str) {
  const maxLength = 240;
  let slug = str.toLowerCase().replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');

  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength).replace(/-+$/, '');
  }
  return slug;
}