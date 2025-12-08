const express = require('express');
const {
    logPageVisit,
    getVisitCounts,
    getVisitCountsByDateRange
} = require('../controllers/pageVisit');

const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth')

router
  .route('/logvisit')
  .post(logPageVisit);

router
  .route('/visitcounts')
  .get(protect, authorize('adminL5'),getVisitCounts);

router
  .route('/visitcountsrange')
  .get(protect, authorize('adminL5'),getVisitCountsByDateRange);

module.exports = router;
