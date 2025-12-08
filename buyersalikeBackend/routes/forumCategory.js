// routes/forumCategory.js
const express = require('express');
const {
  createForumCategory,
  getForumCategories,
  getForumCategory,
  updateForumCategory,
  deleteForumCategory,
} = require('../controllers/forumCategory');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getForumCategories)
  .post(protect, authorize('adminL5'), createForumCategory);

router.route('/:id')
  .get(getForumCategory)
  .put(protect, authorize('adminL5'), updateForumCategory)
  .delete(protect, authorize('adminL5'), deleteForumCategory);

module.exports = router;