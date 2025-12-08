const express = require('express');
const router = express.Router();
const { getRecommendations } = require('../controllers/recommender');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getRecommendations);

module.exports = router;



// const express = require('express');
// const router = express.Router();
// // Import the controller functions
// const { getRecommendations } = require('../controllers/recommender');
// // const { authMiddleware } = require('../middleware/auth'); 
// const { protect, authorize } = require('../middleware/auth');

// /**
//  * The base path for this router is already set to /api/v1/recommender.
//  * This file defines the final endpoint structure.
//  *
//  * GET / - Fetches personalized user and opportunity recommendations for the logged-in user.
//  */
// router.route('/')
//   .get(protect, getRecommendations);

// module.exports = router;
