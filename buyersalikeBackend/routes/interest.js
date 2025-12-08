const express = require('express');
const {
  createInterest,
  getInterests,
  getInterest,
  updateInterest,
  deleteInterest,
  addInterestToUser,
  removeInterestFromUser,
  getUserInterests,
} = require('../controllers/interest');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getInterests) // Any authenticated user can get interests (with modified logic)
  .post(protect, createInterest); // Any authenticated user can add interest

router.route('/:id')
  .get(protect, getInterest)
  .put(protect, /*authorize('admin'),*/ updateInterest) // Only admins can update (including status and message)
  .delete(protect, /*authorize('admin'),*/ deleteInterest);

router.route('/:id/add')
  .post(protect, addInterestToUser); // Any authenticated user can add interest to themselves

router.route('/:id/remove')
  .delete(protect, removeInterestFromUser); // Any authenticated user can remove interest from themselves

// Get interests of a particular user
router.route('/user/:userId')
  .get(protect, getUserInterests);

module.exports = router;