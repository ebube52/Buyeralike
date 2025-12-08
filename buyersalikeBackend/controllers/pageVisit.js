const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');
const models = require('../models');
const moment = require('moment-timezone');


exports.logPageVisit = async (req, res) => {
  try {
    const { userId, pageUrl, userIdentifier } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    await models.PageVisit.create({
      pageUrl,
      visitedAt: moment().tz('Africa/Lagos').toDate(),
      ipAddress,
      userAgent,
      userIdentifier,
      userId
    });

    res.status(200).json({ success: true, message: 'Page visit logged successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getVisitCounts = async (req, res) => {
  const { period, page = 1, pageSize = 10 } = req.query;

  try {
    const now = moment().tz('Africa/Lagos');
    let startDate;

    switch (period) {
      case 'last5Minutes':
        startDate = now.subtract(5, 'minutes');
        break;
      case 'last30Minutes':
        startDate = now.subtract(30, 'minutes');
        break;
      case 'daily':
        startDate = now.startOf('day');
        break;
      case 'weekly':
        startDate = now.startOf('week');
        break;
      case 'monthly':
        startDate = now.startOf('month');
        break;
      case 'yearly':
        startDate = now.startOf('year');
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid period specified.' });
    }

    const offset = (page - 1) * pageSize;

    const { count, rows: visitCounts } = await models.PageVisit.findAndCountAll({
      attributes: [
        'pageUrl',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'totalVisits'],
        [models.sequelize.fn('COUNT', models.sequelize.fn('DISTINCT', models.sequelize.col('userIdentifier'))), 'uniqueVisits'],
      ],
      where: {
        visitedAt: {
          [Op.gte]: startDate.toDate(),
        },
        pageUrl: {
          [Op.ne]: 'https://www.tapwint.com/traffic',
        },
      },
      group: ['pageUrl'],
      order: [[models.sequelize.literal('uniqueVisits'), 'DESC']],
      limit: parseInt(pageSize, 10),
      offset,
    });

    // Query for overall data
    const overallData = await models.PageVisit.findAll({
      attributes: [
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'overallTotalVisits'],
        [models.sequelize.fn('COUNT', models.sequelize.fn('DISTINCT', models.sequelize.col('userIdentifier'))), 'overallUniqueVisits'],
      ],
      where: {
        visitedAt: {
          [Op.gte]: startDate.toDate(),
        },
        pageUrl: {
          [Op.ne]: 'https://www.tapwint.com/traffic',
        },
      },
    });

    const overallTotalVisits = overallData[0].get('overallTotalVisits');
    const overallUniqueVisits = overallData[0].get('overallUniqueVisits');

    const userIdentifiersWithMultipleUsernames = await models.PageVisit.findAll({
      attributes: [
        'userIdentifier',
        [models.sequelize.fn('COUNT', models.sequelize.col('user.id')), 'usernameCount'],
      ],
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: [],
        },
      ],
      where: {
        visitedAt: {
          [Op.gte]: startDate.toDate(),
        },
        pageUrl: {
          [Op.ne]: 'https://www.tapwint.com/traffic',
        },
      },      
      group: ['userIdentifier'],
      having: models.sequelize.literal('COUNT(user.id) > 1'),
    });

    const userIdentifiers = userIdentifiersWithMultipleUsernames.map(row => row.get('userIdentifier'));

    const usernamesByIdentifier = await models.PageVisit.findAll({
      attributes: [
        'userIdentifier',
        [models.sequelize.fn('GROUP_CONCAT', models.sequelize.col('user.username')), 'usernames'],
      ],
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: [],
        },
      ],
      where: {
        userIdentifier: {
          [Op.in]: userIdentifiers,
        },
        visitedAt: {
          [Op.gte]: startDate.toDate(),
        },
        pageUrl: {
          [Op.ne]: 'https://www.tapwint.com/traffic',
        },        
      },
      group: ['userIdentifier'],
    });
    

    const usernamesMap = {};
    usernamesByIdentifier.forEach(row => {
      const userIdentifier = row.get('userIdentifier');
      const usernames = row.get('usernames').split(',');
    
      const uniqueUsernames = [...new Set(usernames)];

      if (uniqueUsernames.length > 1) {
        usernamesMap[userIdentifier] = uniqueUsernames;
      }
    });
    
    const userIdentifiersAndMultipleUsernames = Object.keys(usernamesMap).map(identifier => ({
      identifier,
      usernames: usernamesMap[identifier],
    }));
    

    res.status(200).json({
      success: true,
      visitCounts,
      totalPages: Math.ceil(count.length / pageSize),
      currentPage: page,
      overallTotalVisits,
      overallUniqueVisits,
      userIdentifiersAndMultipleUsernames,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
  
exports.getVisitCountsByDateRange = async (req, res) => {
  const { startDate, endDate, page = 1, pageSize = 10 } = req.query;

  try {
    const parsedStartDate = moment.tz(startDate, 'Africa/Lagos').startOf('day').toDate();
    const parsedEndDate = moment.tz(endDate, 'Africa/Lagos').endOf('day').toDate();

    if (!parsedStartDate || !parsedEndDate || parsedStartDate > parsedEndDate) {
      return res.status(400).json({ success: false, message: 'Invalid date range.' });
    }

    const data = await getVisitCountsQuery(parsedStartDate, parsedEndDate, page, pageSize);

    // Get overall data
    const overallData = await models.PageVisit.findAll({
      attributes: [
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'overallTotalVisits'],
        [models.sequelize.fn('COUNT', models.sequelize.fn('DISTINCT', models.sequelize.col('userIdentifier'))), 'overallUniqueVisits'],
      ],
      where: {
        visitedAt: {
          [Op.between]: [parsedStartDate, parsedEndDate],
        },
        pageUrl: {
          [Op.ne]: 'https://www.tapwint.com/traffic',
        },
      },
    });

    const overallTotalVisits = overallData[0].get('overallTotalVisits');
    const overallUniqueVisits = overallData[0].get('overallUniqueVisits');

    // Get user identifiers with multiple usernames
    const userIdentifiersWithMultipleUsernames = await models.PageVisit.findAll({
      attributes: [
        'userIdentifier',
        [models.sequelize.fn('COUNT', models.sequelize.col('user.id')), 'usernameCount'],
      ],
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: [],
        },
      ],
      where: {
        visitedAt: {
          [Op.between]: [parsedStartDate, parsedEndDate],
        },
        pageUrl: {
          [Op.ne]: 'https://www.tapwint.com/traffic',
        },
      },
      group: ['userIdentifier'],
      having: models.sequelize.literal('COUNT(user.id) > 1'),
    });

    const userIdentifiers = userIdentifiersWithMultipleUsernames.map(row => row.get('userIdentifier'));

    const usernamesByIdentifier = await models.PageVisit.findAll({
      attributes: [
        'userIdentifier',
        [models.sequelize.fn('GROUP_CONCAT', models.sequelize.col('user.username')), 'usernames'],
      ],
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: [],
        },
      ],
      where: {
        userIdentifier: {
          [Op.in]: userIdentifiers,
        },
        visitedAt: {
          [Op.between]: [parsedStartDate, parsedEndDate],
        },
        pageUrl: {
          [Op.ne]: 'https://www.tapwint.com/traffic',
        },
      },
      group: ['userIdentifier'],
    });

    const usernamesMap = {};
    usernamesByIdentifier.forEach(row => {
      const userIdentifier = row.get('userIdentifier');
      const usernames = row.get('usernames').split(',');
    
      const uniqueUsernames = [...new Set(usernames)];

      if (uniqueUsernames.length > 1) {
        usernamesMap[userIdentifier] = uniqueUsernames;
      }
    });
    
    const userIdentifiersAndMultipleUsernames = Object.keys(usernamesMap).map(identifier => ({
      identifier,
      usernames: usernamesMap[identifier],
    }));

    res.status(200).json({
      success: true,
      ...data,
      overallTotalVisits,
      overallUniqueVisits,
      userIdentifiersAndMultipleUsernames,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
 
  
const getVisitCountsQuery = async (startDate, endDate, page, pageSize) => {
  const offset = (page - 1) * pageSize;

  const { count, rows: visitCounts } = await models.PageVisit.findAndCountAll({
    attributes: [
      'pageUrl',
      [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'totalVisits'],
      [models.sequelize.fn('COUNT', models.sequelize.fn('DISTINCT', models.sequelize.col('userIdentifier'))), 'uniqueVisits'],
    ],
    where: {
      visitedAt: {
        [Op.between]: [startDate, endDate],
      },
      pageUrl: {
        [Op.ne]: 'https://www.tapwint.com/traffic',
      },      
    },
    group: ['pageUrl'],
    order: [[models.sequelize.literal('uniqueVisits'), 'DESC']],
    limit: parseInt(pageSize, 10),
    offset,
  });

  return { visitCounts, totalPages: Math.ceil(count.length / pageSize) };
};