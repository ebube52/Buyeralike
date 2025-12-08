const cron = require('node-cron');
const { Op } = require('sequelize');
const models = require('../models');
const { Sequelize } = require('sequelize');
const Redis = require('ioredis');
const redisClient = new Redis(); 

async function updateCacheKeys() {
    try {
      const keysToUpdate = await redisClient.keys('*');
      if (keysToUpdate.length === 0) {
        // console.log('No keys to update.');
        return;
      }
      for (const key of keysToUpdate) {
        //const freshData = await fetchFreshData(redisClient, models, serviceData, key);
        //await redisClient.set(key, JSON.stringify(freshData));
        await redisClient.del(key);
      }      
      //console.log('Cache keys updated successfully.');
    } catch (error) {
      //console.error('Error updating cache keys:', error);
    }
  }
  

async function fetchFreshData(redisClient, models, serviceData, cacheKey) {
  const [type, category, start, size, filters, globalFilter, sorting, search] = cacheKey.split('_');
  const startIndex = parseInt(start) || 0;
  const pageSize = parseInt(size) || 10;
  let whereCondition = {};


  if (type === 'user') {
    if (search && search !== "undefined") {
        const cleanedSearch = search.trim().replace(/\s+/g, ' ');
        if (cleanedSearch) {
        const serviceExactMatch = serviceData.find(service => cleanedSearch.toLowerCase().includes(service.name.toLowerCase()));    

        if (serviceExactMatch) {
            whereCondition = {
                [Op.or]: [
                    Sequelize.where(Sequelize.col('service'), '=', serviceExactMatch.name)
                ]
            };

            const remainingSearch = cleanedSearch.replace(new RegExp(serviceExactMatch.name, 'gi'), '').trim();
            if (remainingSearch) {
                const searchWords = remainingSearch.slice(0, 50).split(/\s+/).filter(Boolean);
                let whereConditionsForOtherColumns = [];
                searchWords.forEach(word => {
                    const condition = {
                        [Op.or]: [
                            Sequelize.where(Sequelize.col('username'), 'LIKE', `%${word}%`),
                            Sequelize.where(Sequelize.col('businessName'), 'LIKE', `%${word}%`),
                            Sequelize.where(Sequelize.col('service'), 'LIKE', `%${word}%`),
                            Sequelize.where(Sequelize.col('country'), 'LIKE', `%${word}%`),
                            Sequelize.where(Sequelize.col('state'), 'LIKE', `%${word}%`),
                            Sequelize.where(Sequelize.col('lga'), 'LIKE', `%${word}%`),
                            Sequelize.where(Sequelize.col('biodata'), 'LIKE', `%${word}%`),
                        ]
                    };
                    whereConditionsForOtherColumns.push(condition);
                });
                whereCondition[Op.and] = whereConditionsForOtherColumns;
            }
        } else {
            const searchWords = cleanedSearch.slice(0, 50).split(/\s+/).filter(Boolean);
            let whereConditionsForOtherColumns = [];
            searchWords.forEach(word => {
                const condition = {
                    [Op.or]: [
                        Sequelize.where(Sequelize.col('username'), 'LIKE', `%${word}%`),
                        Sequelize.where(Sequelize.col('businessName'), 'LIKE', `%${word}%`),
                        Sequelize.where(Sequelize.col('service'), 'LIKE', `%${word}%`),
                        Sequelize.where(Sequelize.col('country'), 'LIKE', `%${word}%`),
                        Sequelize.where(Sequelize.col('state'), 'LIKE', `%${word}%`),
                        Sequelize.where(Sequelize.col('lga'), 'LIKE', `%${word}%`),
                        Sequelize.where(Sequelize.col('biodata'), 'LIKE', `%${word}%`),
                    ]
                };
                whereConditionsForOtherColumns.push(condition);
            });

            whereCondition = {
                [Op.or]: whereConditionsForOtherColumns
            };
        }
        }
    }

    return fetchAllUsersFromDatabase(models, startIndex, pageSize, whereCondition, redisClient, cacheKey);
  }
  
  if (type === 'forumComment') {
    if (search && (search != "undefined")) {
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

    if (category == "Forums Home") {
      return fetchAllForumHomeCommentsFromDatabase(models, startIndex, pageSize, whereCondition, redisClient, cacheKey);
    } else {
      return fetchAllOtherCategoriesCommentsFromDatabase(models, category, startIndex, pageSize, whereCondition, redisClient, cacheKey);
    }
  } 
}

async function fetchAllUsersFromDatabase(models, startIndex, pageSize, whereCondition, redisClient, cacheKey) {
  try {
    const users = await models.User.findAndCountAll({
      attributes: ['id', 'businessName', 'service', 'username', 'profilePhoto', 'verified', 'lga', 'state'],
      where: {
        [Op.and]: [
          whereCondition,
          { suspended: 0 },
          { locked: 0 },
          { deleted: 0 },
        ],
      },
      order: [
        ['verified', 'DESC'],
        [models.sequelize.literal("CASE WHEN plan = 'premium' THEN 1 WHEN plan = 'standard' THEN 2 WHEN plan = 'partner' THEN 3 WHEN plan = 'basic' THEN 4 ELSE 5 END"), 'ASC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM Services WHERE Services.userId = User.id)"), 'DESC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM ForumComments WHERE ForumComments.commentUserId = User.id)"), 'DESC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM FeedbackComments WHERE FeedbackComments.commentUserId = User.id)"), 'DESC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM GroupComments WHERE GroupComments.commentUserId = User.id)"), 'DESC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM ServiceReports WHERE ServiceReports.userId = User.id)"), 'ASC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM ForumCommentReports WHERE ForumCommentReports.commentUserId = User.id)"), 'ASC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM FeedbackCommentReports WHERE FeedbackCommentReports.commentUserId = User.id)"), 'ASC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM GroupCommentReports WHERE GroupCommentReports.commentUserId = User.id)"), 'ASC'],
      ],
      offset: startIndex,
      limit: pageSize,
    });

    const { count, rows } = users;

    let combinedUsers;
    if (startIndex == "0") {
      const priorityUsersPlusUser = await models.PriorityUser.findAll({
        attributes: ['userId'], 
        include: [{
          model: models.User,
          as: 'user', 
          attributes: ['id', 'businessName', 'service', 'username', 'profilePhoto', 'verified', 'lga', 'state'],
          where: {
            [Op.and]: [
              whereCondition, 
              { suspended: 0 }, 
              { locked: 0 }, 
              { deleted: 0 }, 
            ],
          },
        }],
        order: [['bid', 'DESC']]        
      });

      const priorityUsers = priorityUsersPlusUser.map(priorityUser => priorityUser.user);
      combinedUsers =  priorityUsers.concat(rows);
    } else {
      combinedUsers =  rows;
    }

    if (!combinedUsers || combinedUsers.length === 0) {
      const emptyResponse = {
        success: true,
        data: [],
        meta: {
          totalRowCount: 0
        }
      };
      const currentTime = Date.now();
      emptyResponse.timestamp = currentTime;
      return emptyResponse;
    }

    const response = {
      success: true,
      data: combinedUsers,
      meta: {
        totalRowCount: count
      }
    };
    const currentTime = Date.now();
    response.timestamp = currentTime;
    return response;
  } catch (error) {
    throw new Error('Error fetching all users from the database: ' + error.message);
  }
}

async function fetchAllForumHomeCommentsFromDatabase(models, startIndex, pageSize, whereCondition, redisClient, cacheKey) {
    try {
      const comments = await models.ForumComment.findAndCountAll({
        attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked'],
        //where: { fp: true, depth: 0, ...whereCondition, deleted: 0 },
        where: { depth: 0, ...whereCondition, deleted: 0 },
        order: [
          ['createdAt', 'DESC'],
          //['fpTime', 'DESC'],
          [models.sequelize.literal("(SELECT COUNT(*) FROM ForumComments AS Replies WHERE Replies.parentId = ForumComment.id)"), 'DESC'],
          [models.sequelize.literal("(SELECT COUNT(*) FROM ForumCommentReports WHERE ForumCommentReports.commentId = ForumComment.id)"), 'ASC'],
        ],
        offset: startIndex,
        limit: pageSize,
      });      
    
      const { count, rows } = comments;
    
      let combinedComments;
      if (startIndex == "0") {
        const priorityCommentsPlusComment = await models.PriorityForumComment.findAll({
          attributes: ['commentId'], 
          include: [{
            model: models.ForumComment,
            as: 'forumComment', 
            attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked'],
            where: { depth: 0, ...whereCondition, deleted: 0 },
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
        return emptyResponse;
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
      return response;
    } catch (error) {
      throw new Error('Error fetching all users from the database: ' + error.message);
    }
}

async function fetchAllOtherCategoriesCommentsFromDatabase(models, category, startIndex, pageSize, whereCondition, redisClient, cacheKey) {
  try {
    const comments = await models.ForumComment.findAndCountAll({
      attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked'],
      where: { category, depth: 0, ...whereCondition, deleted: 0 },
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
    if (startIndex == "0") {
      const priorityCommentsPlusComment = await models.PriorityForumComment.findAll({
        attributes: ['commentId'], 
        include: [{
          model: models.ForumComment,
          as: 'forumComment', 
          attributes: ['id', 'slug', 'title', 'text', 'image', 'parentId', 'repliesSize', 'depth', 'category', 'commentUserId', 'createdAt', 'likes', 'dislikes', 'reported','numberOfReports','locked'],
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
      return emptyResponse;
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
    return response;
  } catch (error) {
    throw new Error('Error fetching all users from the database: ' + error.message);
  }
}

cron.schedule('*/1 * * * *', async () => {
  await updateCacheKeys();
});

module.exports = { updateCacheKeys };

const serviceData = [{ serviceID: 1, name: "Consumer Goods" }, { serviceID: 2, name: "Industrial/Manufacturing Products" }, { serviceID: 3, name: "Technology Products" }, { serviceID: 4, name: "Healthcare and Pharmaceuticals" }, { serviceID: 5, name: "Food and Beverages" }, { serviceID: 6, name: "Automotive Products" }, { serviceID: 7, name: "Real Estate and Construction" }, { serviceID: 8, name: "Financial Products" }, { serviceID: 9, name: "Entertainment and Media" }, { serviceID: 10, name: "Professional Services" }, { serviceID: 11, name: "Educational Products and Services" }, { serviceID: 12, name: "Environmental Products" }, { serviceID: 13, name: "Travel and Hospitality" }];

