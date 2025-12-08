// routes/openingCategory.js
const express = require('express');
const {
  createOpeningCategory,
  getForumCategories,
  getOpeningCategory,
  updateOpeningCategory,
  deleteOpeningCategory,
} = require('../controllers/openingCategory');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getForumCategories)
  .post(protect, authorize('adminL5'), createOpeningCategory);

router.route('/:id')
  .get(getOpeningCategory)
  .put(protect, authorize('adminL5'), updateOpeningCategory)
  .delete(protect, authorize('adminL5'), deleteOpeningCategory);

module.exports = router;