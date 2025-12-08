'use strict';
const { Sequelize } = require('sequelize');
const models = require('../models');

/**
 * Calculate match percentage between two users based on all relevant fields
 */
const calculateUserMatchPercentage = (user, otherUser) => {
  let score = 0;
  let total = 0;

  // Shared Interests
  const interestWeight = 3;
  total += interestWeight;
  const userInterests = user.Interests || [];
  const otherInterests = otherUser.Interests || [];
  if (userInterests.length && otherInterests.length) {
    const shared = userInterests.filter(i => otherInterests.some(j => j.id === i.id));
    if (shared.length > 0) score += interestWeight;
  }

  // Profession
  const professionWeight = 2;
  total += professionWeight;
  if (user.professionId && otherUser.professionId && user.professionId === otherUser.professionId) {
    score += professionWeight;
  }

  // Location (country, state, lga)
  const locationWeight = 3;
  total += locationWeight;
  if (user.country && otherUser.country && user.country === otherUser.country) score += 1;
  if (user.state && otherUser.state && user.state === otherUser.state) score += 1;
  if (user.lga && otherUser.lga && user.lga === otherUser.lga) score += 1;

  // Role
  const roleWeight = 1;
  total += roleWeight;
  if (user.role && otherUser.role && user.role === otherUser.role) score += roleWeight;

  // Plan
  const planWeight = 1;
  total += planWeight;
  if (user.plan && otherUser.plan && user.plan === otherUser.plan) score += planWeight;

  // Verified
  const verifiedWeight = 1;
  total += verifiedWeight;
  if (user.verified && otherUser.verified) score += verifiedWeight;

  // Occupation
  const occupationWeight = 1;
  total += occupationWeight;
  if (user.occupation && otherUser.occupation && user.occupation === otherUser.occupation) score += occupationWeight;

  // Marital Status
  const maritalWeight = 1;
  total += maritalWeight;
  if (user.maritalStatus && otherUser.maritalStatus && user.maritalStatus === otherUser.maritalStatus) score += maritalWeight;

  return total ? Math.round((score / total) * 100) : 0;
};

/**
 * Recommend users
 */
const getRecommendedUsers = async (userId) => {
  const user = await models.User.findByPk(userId, {
    include: [{ model: models.Interest }, { model: models.Profession, as: 'profession' }]
  });
  if (!user) return [];

  const allUsers = await models.User.findAll({
    where: { id: { [Sequelize.Op.ne]: userId } },
    include: [{ model: models.Interest }, { model: models.Profession, as: 'profession' }]
  });

  const usersWithMatch = allUsers.map(u => ({
    ...u.toJSON(),
    matchPercentage: calculateUserMatchPercentage(user, u)
  }));

  usersWithMatch.sort((a, b) => b.matchPercentage - a.matchPercentage);
  return usersWithMatch;
};

/**
 * Calculate match percentage for an Opening based on user info
 */
const calculateOpeningMatchPercentage = (user, opening) => {
  let score = 0;
  let total = 0;

  const creator = opening.creator || {};

  // Profession match with creator
  const professionWeight = 3;
  total += professionWeight;
  if (user.professionId && creator.professionId && user.professionId === creator.professionId) {
    score += professionWeight;
  }

  // Keyword relevance: title + description + keywords
  const keywordWeight = 3;
  total += keywordWeight;
  const openingText = `${opening.title || ''} ${opening.description || ''}`.toLowerCase();
  if (user.Interests && user.Interests.length > 0) {
    const matchedKeywords = user.Interests.filter(i => openingText.includes(i.name.toLowerCase()));
    if (matchedKeywords.length > 0) score += keywordWeight;
  }

  // Location match with creator (if available)
  const locationWeight = 2;
  total += locationWeight;
  if (user.country && creator.country && user.country === creator.country) score += 1;
  if (user.state && creator.state && user.state === creator.state) score += 0.5;
  if (user.lga && creator.lga && user.lga === creator.lga) score += 0.5;

  // Role match
  const roleWeight = 1;
  total += roleWeight;
  if (user.role && creator.role && user.role === creator.role) score += roleWeight;

  // Plan match
  const planWeight = 1;
  total += planWeight;
  if (user.plan && creator.plan && user.plan === creator.plan) score += planWeight;

  // Verified match
  const verifiedWeight = 1;
  total += verifiedWeight;
  if (user.verified && creator.verified) score += verifiedWeight;

  return total ? Math.round((score / total) * 100) : 0;
};

/**
 * Recommend openings (opportunities)
 * Always return all approved openings, even 0% match
 */
const getRecommendedOpenings = async (userId) => {
  const user = await models.User.findByPk(userId, {
    include: [{ model: models.Interest }, { model: models.Profession, as: 'profession' }]
  });
  if (!user) return [];

  const openings = await models.Opening.findAll({
    where: { 
      status: { [Sequelize.Op.in]: ['verified', 'unverified'] } 
    },
    include: [
      {
        model: models.User,
        as: 'creator',
        include: [{ model: models.Profession, as: 'profession' }]
      },
    ],
  });

  const openingsWithMatch = openings.map(o => ({
    ...o.toJSON(),
    matchPercentage: calculateOpeningMatchPercentage(user, o)
  }));

  openingsWithMatch.sort((a, b) => b.matchPercentage - a.matchPercentage);
  return openingsWithMatch;
};

module.exports = {
  getRecommendedUsers,
  getRecommendedOpenings,
};







// const { Sequelize } = require('sequelize');

// /**
//  * Recommends users based on shared interests.
//  * Excludes the current user and their existing connections.
//  */
// const getRecommendedUsers = async (userId, models) => {
//   // Using models object directly: models.User, models.Interest, models.Connection
    
//   // 1. Find the current user's interests
//   const userInterests = await models.User.findByPk(userId, {
//     include: [{ model: models.Interest, attributes: ['id'] }],
//     attributes: []
//   });
//   const interestIds = userInterests.Interests.map(i => i.id);

//   if (interestIds.length === 0) return [];

//   // 2. Find all users the current user is already connected to (or has pending requests with)
//   const connectedUserIds = (await models.Connection.findAll({
//     where: {
//       [Sequelize.Op.or]: [
//         { requesterId: userId },
//         { receiverId: userId }
//       ],
//       // Filter out 'disconnected' status if you only want active/pending connections
//       status: { [Sequelize.Op.notIn]: ['rejected', 'disconnected'] }  
//     },
//     attributes: [
//       // Uses Sequelize literal with the passed-in userId
//       [Sequelize.literal(`CASE WHEN "requesterId" = '${userId}' THEN "receiverId" ELSE "requesterId" END`), 'connectedUserId']
//     ],
//     raw: true,
//   })).map(c => c.connectedUserId);
  
//   // Add self to exclusion list
//   connectedUserIds.push(userId);
  
//   // 3. Find other users who share interests (excluding connections and self)
//   const recommendedUserIds = await models.UserInterest.findAll({
//     where: {
//       interestId: { [Sequelize.Op.in]: interestIds },
//       userId: { [Sequelize.Op.notIn]: connectedUserIds }
//     },
//     attributes: [
//       'userId',  
//       [Sequelize.fn('COUNT', Sequelize.col('interestId')), 'sharedInterestsCount']
//     ],
//     group: ['userId'],
//     order: [[Sequelize.col('sharedInterestsCount'), 'DESC']],
//     limit: 10,
//     raw: true
//   });

//   const finalUserIds = recommendedUserIds.map(r => r.userId);
  
//   // 4. Fetch full User objects with their associated Profession
//   const usersWithCounts = {};
//   recommendedUserIds.forEach(item => {
//       usersWithCounts[item.userId] = item.sharedInterestsCount;
//   });

//   const recommendedUsers = await models.User.findAll({
//     where: { id: { [Sequelize.Op.in]: finalUserIds } },
//     attributes: ['id', 'firstName', 'lastName', 'username', 'profilePhoto', 'biodata'],
//     include: [{ model: models.Profession, as: 'profession', attributes: ['name'] }]
//   });

//   // Attach the calculated shared interest count
//   return recommendedUsers.map(user => ({
//       ...user.toJSON(),
//       sharedInterestsCount: usersWithCounts[user.id] || 0
//   }));
// };

// /**
//  * Recommends business opportunities based on the user's interests.
//  */
// const getRecommendedOpportunities = async (userId, models) => {
//   // Using models object directly: models.User, models.Opening, models.OpeningCategory

//   // 1. Fetch user's interests and profession
//   const user = await models.User.findByPk(userId, {
//     include: [
//       { model: models.Interest, attributes: ['id', 'name'] },
//       { model: models.Profession, as: 'profession', attributes: ['name'] }
//     ]
//   });

//   if (!user) return [];

//   const userInterestNames = user.Interests.map(i => i.name.toLowerCase());
//   const professionName = user.profession?.name.toLowerCase();

//   // 2. Simple Content-Based Heuristic: Find opportunities whose category name
//   //    or title matches user interests/profession.
  
//   // Create a list of relevant keywords to search the Opening title/description/category
//   const keywords = [...userInterestNames];
//   if (professionName) {
//       keywords.push(professionName);
//   }
  
//   // Use OR to find any opening that matches any keyword
//   const searchConditions = keywords.length > 0 ? {
//     [Sequelize.Op.or]: keywords.map(keyword => ({
//       [Sequelize.Op.or]: [
//         { title: { [Sequelize.Op.iLike]: `%${keyword}%` } },
//         { description: { [Sequelize.Op.iLike]: `%${keyword}%` } },
//         // NOTE: A better approach is to match OpeningCategory ID directly if you link interests to categories.
//       ]
//     }))
//   } : {};
  
//   // Add status filter
//   const finalConditions = {
//     ...searchConditions,
//     status: 'approved', // Only recommend approved openings
//     userId: { [Sequelize.Op.ne]: userId } // Don't recommend the user's own openings
//   };

//   // 3. Fetch opportunities
//   const opportunities = await models.Opening.findAll({
//     where: finalConditions,
//     include: [{ model: models.OpeningCategory, as: 'openingCategory', attributes: ['name'] }],
//     order: [
//       ['createdAt', 'DESC'] // Prioritize recent matching openings
//     ],
//     limit: 10
//   });

//   // 4. Calculate a simple Match Score (e.g., based on keyword overlap)
//   return opportunities.map(opportunity => {
//     let matchScore = 0;
//     const oppText = `${opportunity.title} ${opportunity.description} ${opportunity.openingCategory?.name || ''}`.toLowerCase();
    
//     keywords.forEach(keyword => {
//       if (oppText.includes(keyword)) {
//         matchScore += 1;
//       }
//     });

//     const scorePercentage = Math.min(100, Math.round((matchScore / keywords.length) * 100));

//     return {
//       ...opportunity.toJSON(),
//       matchScore: `${scorePercentage}%`
//     };
//   });
// };

// module.exports = {
//   getRecommendedUsers,
//   getRecommendedOpportunities,
// };
