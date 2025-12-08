const recommenderService = require('../services/recommenderService');
const asyncHandler = require('../middleware/async');

exports.getRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Now the service functions no longer need "models"
  const [users, opportunities] = await Promise.all([
    recommenderService.getRecommendedUsers(userId),
    recommenderService.getRecommendedOpenings(userId)
  ]);

  res.status(200).json({
    success: true,
    data: { users, opportunities }
  });
});



// const recommenderService = require('../services/recommenderService');
// const db = require('../models');
// // Assuming standard use of asyncHandler for error handling abstraction as seen in other controllers
// const asyncHandler = require('../middleware/async'); 

// // @desc    Get personalized recommendations (users and opportunities)
// // @route   GET /api/v1/recommender
// // @access  Protected
// exports.getRecommendations = asyncHandler(async (req, res, next) => {
//   // Extract userId from the request object, which should be set by authMiddleware
//   const userId = req.user.id;
    
//   // Use Promise.all to fetch both recommendations concurrently for better performance
//   const [recommendedUsers, recommendedOpportunities] = await Promise.all([
//       recommenderService.getRecommendedUsers(userId, db),
//       recommenderService.getRecommendedOpportunities(userId, db)
//   ]);

//   res.status(200).json({
//     success: true,
//     data: {
//       users: recommendedUsers,
//       opportunities: recommendedOpportunities,
//     },
//   });
// });
